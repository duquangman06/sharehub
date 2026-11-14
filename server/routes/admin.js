const router = require('express').Router();
const { User, Asset, Category, Booking, AuditLog } = require('../models');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { slugify, recalcTrust } = require('../utils');
router.use(requireAuth, requireAdmin);
router.use(require('./management'));

router.get('/stats', async (req, res) => {
  const [users, assets, bookings, pendingAssets, pendingKyc, openDisputes] = await Promise.all([
    User.countDocuments(), Asset.countDocuments({ status: 'active' }), Booking.countDocuments(),
    Asset.countDocuments({ status: 'pending' }), User.countDocuments({ kycStatus: 'pending' }), Booking.countDocuments({ status: 'disputed' })]);
  res.json({ users, assets, bookings, pendingAssets, pendingKyc, openDisputes });
});

// Danh mục
router.post('/categories', async (req, res) => res.status(201).json(await Category.create({ name: req.body.name, slug: slugify(req.body.name), icon: req.body.icon || '📦' })));
router.delete('/categories/:id', async (req, res) => {
  const c = await Category.findById(req.params.id);
  if (!c) return res.status(404).json({ message: 'Không tìm thấy dữ liệu.' });
  if (await Asset.exists({ category: c.slug })) return res.status(409).json({ message: 'Danh mục đang có tài sản, không thể xóa.' });
  res.json({ deleted: (await Category.deleteOne({ _id: c._id })).deletedCount });
});

// Kiểm duyệt thiết bị
router.get('/assets', async (req, res) => res.json(await Asset.find({ status: req.query.status || 'pending' }).populate('owner', 'name email')));
router.post('/assets/:id/:action(approve|reject)', async (req, res) => {
  const a = await Asset.findOneAndUpdate({ _id: req.params.id, status: 'pending' }, { status: req.params.action === 'approve' ? 'active' : 'rejected' }, { new: true });
  if (!a) return res.status(409).json({message:'Tin đăng không còn chờ duyệt.'});
  await AuditLog.create({actor:req.user._id,action:'listing.'+req.params.action,target:String(a._id)});
  res.json(a);
});

// Xác minh danh tính
router.get('/kyc', async (req, res) => res.json(await User.find({ kycStatus: 'pending' }, 'name email kycImages kycStatus createdAt')));
router.post('/kyc/:id/:action(approve|reject)', async (req, res) => {
  const note = String(req.body.note || '').trim();
  if (note.length < 10) return res.status(400).json({ message: 'Cần ghi căn cứ đối chiếu hoặc lý do từ chối (10 ký tự).' });
  const u = await User.findOne({ _id: req.params.id, kycStatus: 'pending' });
  if (!u) return res.status(409).json({ message: 'Hồ sơ không còn chờ duyệt.' });
  if (req.params.action === 'approve' && (u.kycImages.length !== 2 || !u.kycConsentAt)) return res.status(400).json({ message: 'Cần 2 ảnh và sự đồng ý của người gửi. Yêu cầu nộp lại hồ sơ cũ.' });
  u.kycStatus = req.params.action === 'approve' ? 'verified' : 'rejected';
  u.kycReview = { note, reviewedAt: new Date(), reviewedBy: req.user._id };
  await u.save(); await recalcTrust(u._id);
  await AuditLog.create({ actor: req.user._id, action: 'kyc.' + req.params.action, target: String(u._id), note });
  res.json({ ok: true });
});

// Dispute Room
router.get('/disputes', async (req, res) => {
  res.json(await Booking.find({ status: 'disputed' }).populate('asset', 'title images').populate('renter owner', 'name email').populate('dispute.openedBy', 'name'));
});
router.post('/disputes/:id/resolve', async (req, res) => {
  const b = await Booking.findById(req.params.id);
  if (!b || b.status !== 'disputed') return res.status(400).json({ message: 'Không có tranh chấp đang mở.' });
  const pct = Number(req.body.refundToRenterPercent);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100 || String(req.body.note || '').trim().length < 10) return res.status(400).json({ message: 'Tỷ lệ hoàn cọc phải từ 0–100 và cần căn cứ xử lý.' });
  const refund = Math.round(b.deposit * pct / 100), comp = b.deposit - refund;
  await User.updateOne({ _id: b.renter }, { $inc: { walletBalance: refund, completedCount: 1 } });
  await User.updateOne({ _id: b.owner }, { $inc: { walletBalance: (b.rentalFee - b.discount) + comp, completedCount: 1 } });
  b.dispute.status = 'resolved'; b.dispute.refundToRenterPercent = pct; b.dispute.compensationToOwner = comp;
  b.dispute.adminNote = req.body.note; b.dispute.resolvedAt = new Date();
  b.status = 'completed'; b.paymentStatus = 'partial';
  await b.save();
  await recalcTrust(b.renter);
  await recalcTrust(b.owner);
  await AuditLog.create({ actor: req.user._id, action: 'dispute.resolve', target: String(b._id), note: req.body.note });
  res.json(b);
});
require('../services/transactional')(router);
module.exports = router;

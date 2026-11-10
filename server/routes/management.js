const router = require('express').Router();
const { User, Booking, TrustEvent, AuditLog, Asset } = require('../models');
const { recalcTrust } = require('../utils');
const audit = (req, action, target, note) => AuditLog.create({ actor: req.user._id, action, target: String(target), note });
function pagination(req) {
  const page = Number(req.query.page || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) { const e = new Error('Trang không hợp lệ.'); e.status = 400; throw e; }
  return page;
}
router.get('/users', async (req, res) => {
  const page = pagination(req), filter = {};
  if (req.query.q) { const q = String(req.query.q).slice(0,100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); filter.$or = [{ name: new RegExp(q,'i') },{ email: new RegExp(q,'i') }]; }
  if (['none','pending','verified','rejected'].includes(req.query.kyc)) filter.kycStatus = req.query.kyc;
  const [items, total] = await Promise.all([User.find(filter).select('name email role kycStatus accountStatus trustScore completedCount createdAt').sort('-createdAt').skip((page-1)*20).limit(20), User.countDocuments(filter)]);
  res.json({ items, total, page, totalPages: Math.ceil(total/20) });
});
router.post('/users/:id/status', async (req, res) => {
  if (!['active','suspended'].includes(req.body.status) || String(req.body.note || '').trim().length < 10) return res.status(400).json({ message: 'Cần trạng thái và lý do ít nhất 10 ký tự.' });
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ message: 'Không tìm thấy dữ liệu.' });
  if (u.role === 'admin') return res.status(403).json({ message: 'Không khóa tài khoản quản trị.' });
  u.accountStatus = req.body.status; await u.save();
  await audit(req, 'user.' + req.body.status, u._id, req.body.note); res.json({ ok: true });
});
router.get('/bookings', async (req, res) => {
  const page = pagination(req), filter = {};
  if (['pending','paid','picked_up','returned','completed','rejected','cancelled','disputed'].includes(req.query.status)) filter.status = req.query.status;
  const [items,total] = await Promise.all([Booking.find(filter).populate('asset','title').populate('renter owner','name trustScore kycStatus').sort('-createdAt').skip((page-1)*20).limit(20), Booking.countDocuments(filter)]);
  res.json({ items,total,page,totalPages: Math.ceil(total/20) });
});
router.get('/trust-events', async (req,res) => res.json(await TrustEvent.find().populate('user','name').populate('booking','status').sort('-createdAt').limit(100)));
router.post('/trust-events', async (req,res) => {
  const { user, booking, kind, penalty, summary, evidence } = req.body;
  if (!['late_return','damage','nonpayment','other'].includes(kind) || !Number.isInteger(penalty) || penalty < 1 || penalty > 30 || String(summary || '').trim().length < 10 || String(evidence || '').trim().length < 10) return res.status(400).json({ message: 'Cần loại vi phạm, mức trừ 1–30, mô tả và căn cứ tối thiểu 10 ký tự.' });
  const b = await Booking.findById(booking);
  if (!b || ![String(b.renter),String(b.owner)].includes(user)) return res.status(400).json({ message: 'Tài khoản phải thuộc đơn thuê này.' });
  if (kind === 'late_return' && (String(b.renter) !== user || !b.checkoutAt || +b.checkoutAt <= +b.endDate)) return res.status(400).json({ message: 'Chưa có bằng chứng trả trễ từ thời gian hoàn trả.' });
  if (kind !== 'late_return' && b.dispute?.status !== 'resolved') return res.status(400).json({ message: 'Cần xử lý tranh chấp và lắng nghe hai bên trước khi xác nhận vi phạm.' });
  if (await TrustEvent.exists({user, booking, kind, status:'confirmed'})) return res.status(409).json({ message: 'Vi phạm này đã được ghi nhận.' });
  const event = await TrustEvent.create({ user, booking, kind, penalty, summary:summary.slice(0,500), evidence:evidence.slice(0,2000), createdBy:req.user._id });
  await recalcTrust(user); await audit(req,'trust.confirm',event._id,summary); res.status(201).json(event);
});
router.post('/trust-events/:id/revoke', async (req,res) => {
  if (String(req.body.note || '').trim().length < 10) return res.status(400).json({ message:'Cần lý do khôi phục điểm.' });
  const e = await TrustEvent.findOneAndUpdate({_id:req.params.id,status:'confirmed'}, {status:'revoked',resolution:req.body.note,resolvedAt:new Date()}, {new:true});
  if (!e) return res.status(409).json({message:'Vi phạm không còn hiệu lực.'});
  await recalcTrust(e.user); await audit(req,'trust.revoke',e._id,req.body.note); res.json({ok:true});
});
router.get('/audit', async (req,res) => res.json(await AuditLog.find().populate('actor','name').sort('-createdAt').limit(100)));
router.get('/reports', async (req,res) => {
  const [settled, topMembers] = await Promise.all([
    Booking.aggregate([{$match:{status:'completed'}},{$group:{_id:null,rentalRevenue:{$sum:{$subtract:['$rentalFee','$discount']}},completed:{$sum:1}}}]),
    User.find({role:'user'}).select('name completedCount trustScore').sort({completedCount:-1}).limit(5)
  ]);
  res.json({ settled:settled[0] || {rentalRevenue:0,completed:0}, topMembers });
});
router.post('/listings/:id/status', async (req,res) => {
  if (!['hidden','pending'].includes(req.body.status) || String(req.body.note || '').trim().length < 10) return res.status(400).json({message:'Cần trạng thái và lý do.'});
  const a = await Asset.findByIdAndUpdate(req.params.id,{status:req.body.status},{new:true});
  if (!a) return res.status(404).json({ message: 'Không tìm thấy dữ liệu.' });
  await audit(req,'listing.'+req.body.status,a._id,req.body.note); res.json(a);
});
require('../services/transactional')(router);
module.exports = router;

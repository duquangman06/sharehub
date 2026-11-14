const router = require('express').Router();
const { User, Asset, Category, Booking, AuditLog } = require('../models');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { slugify, recalcTrust } = require('../utils');
router.use(requireAuth, requireAdmin);
router.use(require('./management'));

router.get('/stats', async (req, res) => res.json(await require('../services/admin-analytics').dashboard()));
router.use('/demo', require('./admin-demo'));

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
router.get('/kyc', async (req, res) => {
  const status = req.query.status || 'pending';
  if (!['pending','verified','rejected','all'].includes(status)) return res.status(400).json({message:'Bộ lọc hồ sơ không hợp lệ.'});
  const filter = status === 'all' ? { $or:[{kycStatus:'pending'},{'kycReview.reviewedAt':{$exists:true}}] } : {kycStatus:status};
  res.json(await User.find(filter).select('name email kycImages kycStatus kycConsentAt kycSubmission kycReview kycHistory isDemo createdAt').populate('kycReview.reviewedBy','name').sort({'kycSubmission.submittedAt':-1,createdAt:-1}).limit(100));
});
router.post('/kyc/:id/:action(approve|reject)', async (req, res) => {
  const note = String(req.body.note || '').trim();
  if (note.length < 10 || note.length > 2000) return res.status(400).json({ message: 'Cần căn cứ đối chiếu hoặc lý do từ chối từ 10–2000 ký tự.' });
  const u = await User.findOne({ _id: req.params.id, kycStatus: 'pending' });
  if (!u) return res.status(409).json({ message: 'Hồ sơ không còn chờ duyệt. Hãy tải lại danh sách.' });
  if (req.params.action === 'approve' && (u.kycImages.length !== 2 || !u.kycConsentAt)) return res.status(400).json({ message: 'Cần hai ảnh và thông tin đồng ý xử lý. Hồ sơ thiếu ảnh cần được yêu cầu bổ sung hoặc từ chối với lý do.' });
  const status = req.params.action === 'approve' ? 'verified' : 'rejected';
  const review = {note,reviewedAt:new Date(),reviewedBy:req.user._id};
  const updated = await User.findOneAndUpdate({_id:u._id,kycStatus:'pending'},{$set:{kycStatus:status,kycReview:review},$push:{kycHistory:{...review,status}}},{new:true});
  if (!updated) return res.status(409).json({message:'Hồ sơ đã được xử lý ở phiên khác.'});
  await recalcTrust(u._id);
  await AuditLog.create({actor:req.user._id,action:'kyc.'+req.params.action,target:String(u._id),note});
  res.json({ok:true,status,reviewedAt:review.reviewedAt});
});

// Dispute Room
router.get('/disputes', async (req, res) => {
  const status=req.query.status||'open';
  if (!['open','resolved','all'].includes(status)) return res.status(400).json({message:'Bộ lọc tranh chấp không hợp lệ.'});
  const filter=status==='all'?{'dispute.status':{$in:['open','resolved']}}:{'dispute.status':status};
  res.json(await Booking.find(filter).populate('asset','title images').populate('renter owner','name email').populate('dispute.openedBy dispute.resolvedBy dispute.responses.from','name').sort({'dispute.resolvedAt':-1,updatedAt:-1}).limit(100));
});
router.post('/disputes/:id/resolve', async (req, res) => {
  const pct=req.body.refundToRenterPercent;
  const note=String(req.body.note||'').trim();
  if (typeof pct!=='number' || !Number.isFinite(pct) || pct<0 || pct>100 || note.length<10 || note.length>2000) return res.status(400).json({message:'Nhập tỷ lệ hoàn cọc từ 0–100 và căn cứ xử lý từ 10–2000 ký tự.'});
  const b=await Booking.findOne({_id:req.params.id,status:'disputed','dispute.status':'open'});
  if (!b) return res.status(409).json({message:'Tranh chấp đã được xử lý hoặc không còn mở. Không phân bổ tiền lần nữa.'});
  const refund=Math.round(b.deposit*pct/100),comp=b.deposit-refund;
  const rental=Math.max(0,b.rentalFee-(b.discount||0));
  const resolvedAt=new Date();
  const result=await Booking.findOneAndUpdate({_id:b._id,status:'disputed','dispute.status':'open'},{$set:{
    status:'completed',paymentStatus:'partial','dispute.status':'resolved','dispute.refundToRenterPercent':pct,
    'dispute.refundToRenter':refund,'dispute.compensationToOwner':comp,'dispute.rentalReleasedToOwner':rental,
    'dispute.depositAtResolution':b.deposit,'dispute.adminNote':note,'dispute.resolvedAt':resolvedAt,'dispute.resolvedBy':req.user._id
  }},{new:true});
  if (!result) return res.status(409).json({message:'Tranh chấp đã được xử lý ở phiên khác.'});
  await User.updateOne({_id:b.renter},{$inc:{walletBalance:refund,completedCount:1}});
  await User.updateOne({_id:b.owner},{$inc:{walletBalance:rental+comp,completedCount:1}});
  await recalcTrust(b.renter); await recalcTrust(b.owner);
  await AuditLog.create({actor:req.user._id,action:'dispute.resolve',target:String(b._id),note});
  res.json(result);
});
require('../services/transactional')(router);
module.exports = router;

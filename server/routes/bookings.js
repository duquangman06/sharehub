const router = require('express').Router();
const { Asset, Booking, Review, User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { dayDiff, token, ACTIVE, recalcTrust } = require('../utils');

const { TERMS, acceptance, validPeriod, ownerEligibility } = require('../services/policy');
router.get('/terms', (req, res) => res.json(TERMS));

router.use((req, res, next) => {
  const send = res.json.bind(res);
  res.json = data => {
    function safe(value) {
      if (Array.isArray(value)) return value.map(safe);
      if (!value || typeof value !== 'object') return value;
      const obj = value.toObject ? value.toObject() : { ...value };
      if (obj.pickupToken || obj.returnToken) {
        const uid = String(req.user?._id);
        if (req.user?.role !== 'admin') {
          if (uid !== String(obj.owner?._id || obj.owner)) delete obj.pickupToken;
          if (uid !== String(obj.renter?._id || obj.renter)) delete obj.returnToken;
        }
      }
      return obj;
    }
    return send(safe(data));
  };
  next();
});
const COUPONS = { SHAREHUB10: 0.1, WELCOME: 0.05 };

async function isFree(asset, start, end) {
  const buffer = (asset.bufferHours || 0) * 3600000;
  const clash = await Booking.exists({ asset: asset._id, status: { $in: ACTIVE }, startDate: { $lt: new Date(+end + buffer) }, endDate: { $gt: new Date(+start - buffer) } });
  const blocked = asset.blockedRanges.some(r => r.from < end && r.to > start);
  return !clash && !blocked;
}
function price(asset, start, end, coupon) {
  const days = dayDiff(start, end);
  const rentalFee = days * asset.pricePerDay;
  const discount = Math.round(rentalFee * (COUPONS[(coupon || '').toUpperCase()] || 0));
  return { days, rentalFee, deposit: asset.deposit, discount, total: rentalFee - discount + asset.deposit };
}

/* ===== TEMPORARY CART (Session) – Chương VIII =====
   Khách chưa đăng nhập vẫn lưu được "đơn nháp" trong req.session (RAM/store phía server).
   Khi đăng nhập + thanh toán → ghi vĩnh viễn vào MongoDB. */
router.get('/draft', async (req, res) => {
  const d = req.session.draft;
  if (!d) return res.json(null);
  if (Date.now() > d.expiresAt) { delete req.session.draft; return res.json(null); }
  const asset = await Asset.findById(d.assetId).populate('owner', 'name avatar kycStatus accountStatus');
  if (!asset || asset.status !== 'active') return res.json(null);
  res.json({ ...d, asset, bookingEligibility:ownerEligibility(asset.owner), ...price(asset, new Date(d.startDate), new Date(d.endDate), d.coupon) });
});
router.post('/draft', async (req, res) => {
  const { assetId, startDate, endDate, coupon } = req.body;
  const asset = await Asset.findById(assetId);
  if (!asset || asset.status !== 'active' || !validPeriod(new Date(startDate), new Date(endDate))) return res.status(400).json({ message: 'Thời gian thuê chưa hợp lệ.' });
  const eligibility = ownerEligibility(await User.findById(asset.owner));
  if (!eligibility.allowed) return res.status(403).json(eligibility);
  if (!(await isFree(asset, new Date(startDate), new Date(endDate)))) return res.status(409).json({ message: 'Thiết bị không còn trống trong khoảng ngày này.' });
  req.session.draft = { assetId, startDate, endDate, coupon: coupon || '', expiresAt: Date.now() + 15 * 60 * 1000 }; // giữ chỗ 15 phút
  res.json({ ok: true, expiresAt: req.session.draft.expiresAt });
});
router.delete('/draft', (req, res) => { delete req.session.draft; res.json({ ok: true }); });

// Thanh toán + tạo đơn (đồng bộ vĩnh viễn từ Session → MongoDB)
router.post('/checkout', requireAuth, async (req, res) => {
  const d = req.session.draft;
  if (!d || Date.now() > d.expiresAt) return res.status(410).json({ message: 'Bản nháp 15 phút đã hết hạn. Vui lòng chọn lại ngày thuê.' });
  const termsAcceptance = acceptance(req.body, req.user._id);
  const asset = await Asset.findByIdAndUpdate(d.assetId, { $inc: { bookingRevision: 1 } }, { new: true });
  if (!asset || asset.status !== 'active') return res.status(409).json({ message: 'Tài sản không còn nhận đặt thuê.' });
  const owner = await User.findById(asset.owner);
  const eligibility = ownerEligibility(owner);
  if (!eligibility.allowed) return res.status(403).json(eligibility);
  if (String(asset.owner) === String(req.user._id)) return res.status(400).json({ message: 'Bạn không thể thuê thiết bị của chính mình.' });
  const start = new Date(d.startDate), end = new Date(d.endDate);
  if (!(await isFree(asset, start, end))) return res.status(409).json({ message: 'Thiết bị không còn trống trong khoảng ngày này.' });
  const p = price(asset, start, end, d.coupon);
  if (!validPeriod(start, end)) return res.status(400).json({ message: 'Thời gian thuê không hợp lệ.' });
  const method = req.body.paymentMethod || 'wallet';
  if (method !== 'wallet') return res.status(400).json({ message: 'Chỉ hỗ trợ ví mô phỏng; cổng thanh toán chưa kết nối.' });
  if (method === 'wallet') {
    const debited = await User.findOneAndUpdate({ _id: req.user._id, walletBalance: { $gte: p.total } }, { $inc: { walletBalance: -p.total } });
    if (!debited) return res.status(402).json({ message: 'Số dư ví mô phỏng chưa đủ.' });

  }
  const booking = await Booking.create({
    asset: asset._id, renter: req.user._id, owner: asset.owner, startDate: start, endDate: end, ...p,
    termsAcceptance, handoverAddress: asset.location?.address, paymentMethod: method, paymentStatus: 'authorized', status: 'pending',
    pickupToken: token(), returnToken: token(),
  });
  res.status(201).json(booking);
});

router.get('/', requireAuth, async (req, res) => {
  const role = req.query.role === 'owner' ? 'owner' : 'renter';
  const list = await Booking.find({ [role]: req.user._id }).sort('-createdAt')
    .populate('asset', 'title images category location').populate('renter owner', 'name avatar trustScore kycStatus');
  res.json(list);
});

router.get('/:id', requireAuth, async (req, res) => {
  const b = await Booking.findById(req.params.id).populate('asset').populate('renter owner', 'name avatar trustScore ratingAvg phone kycStatus');
  if (!b) return res.status(404).json({ message: 'Không tìm thấy đơn thuê.' });
  const uid = String(req.user._id);
  if (![String(b.renter._id), String(b.owner._id)].includes(uid) && req.user.role !== 'admin') return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này.' });
  const obj = b.toObject();
  const isRenter = uid === String(b.renter._id);
  // Mỗi bên chỉ thấy mã QR mình cần hiển thị
  if (isRenter) delete obj.pickupToken; else if (req.user.role !== 'admin') delete obj.returnToken;
  obj.myRole = isRenter ? 'renter' : (uid === String(b.owner._id) ? 'owner' : 'admin');
  res.json(obj);
});

async function loadMine(req, res, role) {
  const b = await Booking.findById(req.params.id);
  if (!b || String(b[role]) !== String(req.user._id)) { res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này.' }); return null; }
  return b;
}

// Chủ đồ chấp nhận / từ chối → khi chấp nhận, tiền được "capture" (đã thanh toán, cọc bị giữ)
router.post('/:id/approve', requireAuth, async (req, res) => {
  const b = await loadMine(req, res, 'owner'); if (!b) return;
  if (b.status !== 'pending') return res.status(400).json({ message: 'Đơn thuê không còn ở trạng thái chờ duyệt.' });
  b.status = 'paid'; b.paymentStatus = 'captured'; await b.save(); res.json(b);
});
router.post('/:id/reject', requireAuth, async (req, res) => {
  const b = await loadMine(req, res, 'owner'); if (!b) return;
  if (b.status !== 'pending') return res.status(400).json({ message: 'Đơn thuê không còn ở trạng thái chờ duyệt.' });
  b.status = 'rejected'; b.rejectReason = req.body.reason || 'No reason given';
  b.paymentStatus = 'refunded';
  await User.updateOne({ _id: b.renter }, { $inc: { walletBalance: b.total } });
  await b.save(); res.json(b);
});
router.post('/:id/cancel', requireAuth, async (req, res) => {
  const b = await loadMine(req, res, 'renter'); if (!b) return;
  if (!['pending', 'paid'].includes(b.status)) return res.status(400).json({ message: 'Không thể hủy đơn ở bước hiện tại.' });
  b.status = 'cancelled'; b.paymentStatus = 'refunded';
  await User.updateOne({ _id: b.renter }, { $inc: { walletBalance: b.total } });
  await b.save(); res.json(b);
});

// CHECK-IN: người thuê quét QR của chủ (nhập/mở token) + chụp tối đa 4 ảnh hiện trạng
router.post('/:id/checkin', requireAuth, upload.array('photos', 4), async (req, res) => {
  const b = await loadMine(req, res, 'renter'); if (!b) return;
  if (b.status !== 'paid') return res.status(400).json({ message: 'Đơn thuê cần được thanh toán và duyệt trước.' });
  if ((req.body.token || '').toUpperCase() !== b.pickupToken) return res.status(400).json({ message: 'Mã bàn giao chưa đúng.' });
  if (!req.files?.length || !String(req.body.note || '').trim()) return res.status(400).json({ message: 'Cần ảnh và biên bản hiện trạng, phụ kiện trước khi nhận.' });
  if (Date.now() < +b.startDate || Date.now() >= +b.endDate) return res.status(400).json({ message: 'Chỉ nhận trong khoảng thời gian thuê.' });
  b.pickupNote = String(req.body.note).trim().slice(0, 2000);
  b.checkinPhotos = (req.files || []).map(f => '/uploads/' + f.filename);
  b.checkinAt = new Date(); b.status = 'picked_up'; await b.save(); res.json(b);
});
// CHECK-OUT: chủ quét QR của người thuê + chụp ảnh đối chiếu
router.post('/:id/checkout', requireAuth, upload.array('photos', 4), async (req, res) => {
  const b = await loadMine(req, res, 'owner'); if (!b) return;
  if (b.status !== 'picked_up') return res.status(400).json({ message: 'Tài sản chưa được xác nhận đã nhận.' });
  if ((req.body.token || '').toUpperCase() !== b.returnToken) return res.status(400).json({ message: 'Mã bàn giao chưa đúng.' });
  if (!req.files?.length || !String(req.body.note || '').trim()) return res.status(400).json({ message: 'Cần ảnh và biên bản trả tài sản.' });
  b.returnNote = String(req.body.note).trim().slice(0, 2000);
  b.checkoutPhotos = (req.files || []).map(f => '/uploads/' + f.filename);
  b.checkoutAt = new Date(); b.status = 'returned'; await b.save(); res.json(b);
});
// Chủ xác nhận không có vấn đề → hoàn cọc, hoàn tất
router.post('/:id/complete', requireAuth, async (req, res) => {
  const b = await loadMine(req, res, 'owner'); if (!b) return;
  if (b.status !== 'returned') return res.status(400).json({ message: 'Tài sản chưa được xác nhận đã trả.' });
  await User.updateOne({ _id: b.renter }, { $inc: { walletBalance: b.deposit, completedCount: 1 } });
  await User.updateOne({ _id: b.owner }, { $inc: { walletBalance: b.rentalFee - b.discount, completedCount: 1 } });
  b.status = 'completed'; b.paymentStatus = 'partial'; await b.save();
  await recalcTrust(b.renter);
  await recalcTrust(b.owner);
  res.json(b);
});
// Báo cáo sự cố / khiếu nại
router.post('/:id/dispute', requireAuth, async (req, res) => {
  const b = await Booking.findById(req.params.id);
  const uid = String(req.user._id);
  if (!b || ![String(b.renter), String(b.owner)].includes(uid)) return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này.' });
  if (!['picked_up', 'returned'].includes(b.status)) return res.status(400).json({ message: 'Chỉ mở tranh chấp sau khi đã nhận tài sản.' });
  if (String(req.body.reason || '').trim().length < 10) return res.status(400).json({message:'Mô tả sự cố ít nhất 10 ký tự.'});
  b.status = 'disputed'; b.dispute = { openedBy: req.user._id, reason: req.body.reason || 'Issue reported', status: 'open' };
  await b.save(); res.json(b);
});

// Both parties can submit evidence while funds remain frozen.
router.post('/:id/dispute-evidence', requireAuth, upload.array('photos', 4), async (req, res) => {
  const b = await Booking.findById(req.params.id);
  if (!b || ![String(b.renter),String(b.owner)].includes(String(req.user._id))) return res.status(403).json({message:'Không có quyền.'});
  if (b.status !== 'disputed' || b.dispute?.status !== 'open') return res.status(409).json({message:'Tranh chấp đã đóng.'});
  const note = String(req.body.note || '').trim();
  if (note.length < 10) return res.status(400).json({message:'Cần mô tả bằng chứng ít nhất 10 ký tự.'});
  if (b.dispute.responses.length >= 20) return res.status(400).json({message:'Đã đạt giới hạn 20 phản hồi. Vui lòng liên hệ quản trị viên.'});
  b.dispute.responses.push({from:req.user._id,note:note.slice(0,2000),photos:(req.files || []).map(f => '/uploads/' + f.filename),at:new Date()});
  await b.save(); res.json(b);
});

// Đánh giá chéo (mutual review)
router.post('/:id/review', requireAuth, async (req, res) => {
  const b = await Booking.findById(req.params.id);
  const uid = String(req.user._id);
  if (!b || b.status !== 'completed' || ![String(b.renter), String(b.owner)].includes(uid)) return res.status(400).json({ message: 'Chưa thể đánh giá đơn thuê này.' });
  const isRenter = uid === String(b.renter);
  if (isRenter ? b.reviewedByRenter : b.reviewedByOwner) return res.status(400).json({ message: 'Bạn đã đánh giá đơn thuê này.' });
  const to = isRenter ? b.owner : b.renter;
  const rating = Math.min(5, Math.max(1, +req.body.rating || 5));
  await Review.create({ booking: b._id, asset: b.asset, from: req.user._id, to, rating, comment: req.body.comment });
  const target = await User.findById(to);
  target.ratingAvg = +(((target.ratingAvg * target.ratingCount) + rating) / (target.ratingCount + 1)).toFixed(2);
  target.ratingCount += 1; await target.save();
  if (isRenter) {
    const a = await Asset.findById(b.asset);
    a.ratingAvg = +(((a.ratingAvg * a.ratingCount) + rating) / (a.ratingCount + 1)).toFixed(2); a.ratingCount += 1; await a.save();
    b.reviewedByRenter = true;
  } else b.reviewedByOwner = true;
  await b.save(); await recalcTrust(to);
  res.json({ ok: true });
});

require('../services/transactional')(router);
module.exports = router;

const router = require('express').Router();
const { Asset, Booking, Review } = require('../models');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { haversine, slugify, ACTIVE } = require('../utils');
const { ownerEligibility } = require('../services/policy');

// GET /api/assets?q=&category=&min=&max=&lat=&lng=&radius=&rating=&delivery=&sort=
router.get('/', async (req, res) => {
  const { q, category, min, max, lat, lng, radius, rating, delivery, sort } = req.query;
  const filter = { status: 'active' };
  if (category) filter.category = category;
  if (q) filter.title = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (min || max) filter.pricePerDay = { ...(min && { $gte: +min }), ...(max && { $lte: +max }) };
  if (rating) filter.ratingAvg = { $gte: +rating };
  if (delivery && delivery !== 'any') filter.delivery = { $in: [delivery, 'both'] };
  let items = (await Asset.find(filter).populate('owner', 'name avatar kycStatus ratingAvg trustScore')).map(a => a.toObject());
  if (lat && lng) {
    items.forEach(a => a.distance = a.location?.lat ? haversine(+lat, +lng, a.location.lat, a.location.lng) : null);
    if (radius) items = items.filter(a => a.distance !== null && a.distance <= +radius);
  }
  // Lọc theo ngày còn trống
  if (req.query.from && req.query.to) {
    const busy = await Booking.find({ status: { $in: ACTIVE }, startDate: { $lt: new Date(req.query.to) }, endDate: { $gt: new Date(req.query.from) } }).distinct('asset');
    const busySet = new Set(busy.map(String));
    items = items.filter(a => !busySet.has(String(a._id)));
  }
  const sorters = { price_asc: (a, b) => a.pricePerDay - b.pricePerDay, price_desc: (a, b) => b.pricePerDay - a.pricePerDay,
    rating: (a, b) => b.ratingAvg - a.ratingAvg, distance: (a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9) };
  if (sorters[sort]) items.sort(sorters[sort]);
  res.json(items);
});

router.get('/mine', requireAuth, async (req, res) => {
  res.json(await Asset.find({ owner: req.user._id }).sort('-createdAt'));
});

router.get('/:id', async (req, res) => {
  const a = await Asset.findById(req.params.id).populate('owner', 'name avatar bio kycStatus accountStatus ratingAvg ratingCount trustScore avgResponseMinutes completedCount');
  if (!a) return res.status(404).json({ message: 'Không tìm thấy thiết bị.' });
  res.json({...a.toObject(),bookingEligibility:ownerEligibility(a.owner)});
});

// Ngày đã kín (booking + bảo dưỡng + buffer time)
router.get('/:id/availability', async (req, res) => {
  const a = await Asset.findById(req.params.id);
  if (!a) return res.status(404).json({ message: 'Không tìm thấy thiết bị.' });
  const bookings = await Booking.find({ asset: a._id, status: { $in: ACTIVE } });
  const bufferDays = (a.bufferHours || 0) / 24;
  const ranges = bookings.map(b => ({ from: b.startDate, to: new Date(+b.endDate + bufferDays * 86400000), type: 'booked' }));
  a.blockedRanges.forEach(r => ranges.push({ from: r.from, to: r.to, type: 'maintenance', reason: r.reason }));
  res.json(ranges);
});

router.get('/:id/reviews', async (req, res) => {
  const reviews = await Review.find({ asset: req.params.id }).sort('-createdAt').limit(30).populate('from', 'name avatar');
  res.json(reviews);
});

const fields = upload.fields([{ name: 'images', maxCount: 6 }, { name: 'serialImage', maxCount: 1 }]);
function applyBody(a, body, files) {
  ['title', 'category', 'description', 'delivery', 'video'].forEach(k => body[k] !== undefined && (a[k] = body[k]));
  ['pricePerHour', 'pricePerDay', 'deposit', 'bufferHours', 'purchasePrice', 'condition'].forEach(k => body[k] !== undefined && body[k] !== '' && (a[k] = +body[k]));
  if (body.accessories !== undefined) a.accessories = String(body.accessories).split(',').map(s => s.trim()).filter(Boolean);
  if (body.lat && body.lng) a.location = { lat: +body.lat, lng: +body.lng, address: body.address || '' };
  if (files?.images?.length) a.images = [...(body.keepImages ? JSON.parse(body.keepImages) : []), ...files.images.map(f => '/uploads/' + f.filename)];
  else if (body.keepImages) a.images = JSON.parse(body.keepImages);
  if (files?.serialImage?.length) a.serialImage = '/uploads/' + files.serialImage[0].filename;
  if (body.title) a.slug = slugify(body.title) + '-' + String(a._id).slice(-4);
}

router.post('/', requireAuth, fields, async (req, res) => {
  if (!req.body.title || !req.body.pricePerDay || !req.body.category) return res.status(400).json({ message: 'Vui lòng nhập tên thiết bị, danh mục và giá thuê mỗi ngày.' });
  const a = new Asset({ owner: req.user._id, title: req.body.title, category: req.body.category, pricePerDay: +req.body.pricePerDay });
  applyBody(a, req.body, req.files);
  if (![a.pricePerDay, a.deposit, a.bufferHours, a.purchasePrice, a.pricePerHour].every(n => Number.isFinite(n) && n >= 0) || a.pricePerDay <= 0) return res.status(400).json({ message: 'Giá thuê phải lớn hơn 0; cọc và các khoản khác không được âm.' });
  // Mọi tin mới cần admin kiểm duyệt.
  a.status = 'pending';
  await a.save();
  res.status(201).json(a);
});

router.put('/:id', requireAuth, fields, async (req, res) => {
  const a = await Asset.findOne({ _id: req.params.id, owner: req.user._id });
  if (!a) return res.status(404).json({ message: 'Không tìm thấy thiết bị.' });
  applyBody(a, req.body, req.files);
  if (![a.pricePerDay, a.deposit, a.bufferHours, a.purchasePrice, a.pricePerHour].every(n => Number.isFinite(n) && n >= 0) || a.pricePerDay <= 0) return res.status(400).json({ message: 'Giá thuê phải lớn hơn 0; cọc và các khoản khác không được âm.' });
  if (req.body.status && ['active', 'hidden'].includes(req.body.status) && a.status !== 'pending' && a.status !== 'rejected') a.status = req.body.status === 'active' ? 'pending' : 'hidden';
  if (a.status === 'active' && Object.keys(req.body).some(k => k !== 'status')) a.status = 'pending';
  await a.save();
  res.json(a);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const a = await Asset.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, { status: 'hidden' });
  res.json({ deleted: a ? 1 : 0 });
});

router.post('/:id/block', requireAuth, async (req, res) => {
  const a = await Asset.findOne({ _id: req.params.id, owner: req.user._id });
  if (!a) return res.status(404).json({ message: 'Không tìm thấy thiết bị.' });
  a.blockedRanges.push({ from: new Date(req.body.from), to: new Date(req.body.to), reason: req.body.reason || 'Maintenance' });
  await a.save();
  res.json(a);
});

module.exports = router;

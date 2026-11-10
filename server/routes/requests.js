// Reverse Matching: người thuê đăng nhu cầu → hệ thống ghép chủ đồ phù hợp
const router = require('express').Router();
const { RentalRequest, Asset, Booking } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { haversine, ACTIVE } = require('../utils');

router.post('/', requireAuth, async (req, res) => {
  const { title, category, budget, dateFrom, dateTo, radius, lat, lng, details } = req.body;
  if (!category || !budget || !lat || !lng) return res.status(400).json({ message: 'Category, budget and location are required.' });
  const assets = await Asset.find({ status: 'active', category, pricePerDay: { $lte: +budget }, owner: { $ne: req.user._id } }).populate('owner', 'name avatar ratingAvg trustScore');
  let busy = new Set();
  if (dateFrom && dateTo) busy = new Set((await Booking.find({ status: { $in: ACTIVE }, startDate: { $lt: new Date(dateTo) }, endDate: { $gt: new Date(dateFrom) } }).distinct('asset')).map(String));
  const matches = [];
  for (const a of assets) {
    if (busy.has(String(a._id)) || !a.location?.lat) continue;
    const distance = haversine(+lat, +lng, a.location.lat, a.location.lng);
    if (distance > (+radius || 5)) continue;
    // Điểm tương thích: giá (40) + khoảng cách (30) + uy tín chủ (30)
    const priceScore = 40 * (1 - Math.max(0, (a.pricePerDay / +budget) - 0.5));
    const distScore = 30 * (1 - distance / (+radius || 5));
    const trustScore = 30 * ((a.owner.trustScore || 50) / 100);
    const score = Math.max(50, Math.min(99, Math.round(priceScore + distScore + trustScore)));
    matches.push({ asset: a._id, score, distance, _a: a });
  }
  matches.sort((x, y) => y.score - x.score);
  const saved = await RentalRequest.create({ renter: req.user._id, title, category, budget, dateFrom, dateTo, radius, lat, lng, details,
    matches: matches.slice(0, 6).map(({ asset, score, distance }) => ({ asset, score, distance })) });
  res.status(201).json({ _id: saved._id, matches: matches.slice(0, 6).map(m => ({ score: m.score, distance: m.distance, asset: m._a })) });
});

router.get('/mine', requireAuth, async (req, res) => {
  res.json(await RentalRequest.find({ renter: req.user._id }).sort('-createdAt').limit(10));
});
module.exports = router;

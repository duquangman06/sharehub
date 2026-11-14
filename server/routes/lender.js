const router = require('express').Router();
const { Asset, Booking } = require('../models');
const { requireAuth } = require('../middleware/auth');
router.use(requireAuth);

// Dashboard doanh thu + tỷ lệ khai thác + ROI
router.get('/analytics', async (req, res) => {
  const now = new Date(), monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const done = await Booking.find({ owner: req.user._id, status: 'completed' }).populate('asset', 'title purchasePrice');
  const net = b => b.rentalFee - (b.discount || 0);
  const thisMonth = done.filter(b => b.startDate >= monthStart);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const assets = await Asset.find({ owner: req.user._id, status: 'active' });
  const rentedDays = thisMonth.reduce((s, b) => s + b.days, 0);
  const utilization = assets.length ? Math.min(100, Math.round(rentedDays / (daysInMonth * assets.length) * 100)) : 0;
  const weekly = Array.from({ length: 8 }, (_, i) => {
    const to = new Date(now - i * 7 * 86400000), from = new Date(+to - 7 * 86400000);
    return { label: `Tuần ${8 - i}`, revenue: done.filter(b => b.startDate >= from && b.startDate < to).reduce((s, b) => s + net(b), 0) };
  }).reverse();
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1), e = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return { label: d.toLocaleString('vi-VN', { month: 'short' }), revenue: done.filter(b => b.startDate >= d && b.startDate < e).reduce((s, b) => s + net(b), 0) };
  });
  const perAsset = assets.map(a => {
    const rev = done.filter(b => String(b.asset._id) === String(a._id)).reduce((s, b) => s + net(b), 0);
    return { _id: a._id, title: a.title, purchasePrice: a.purchasePrice, revenue: rev, recovered: a.purchasePrice ? Math.min(100, Math.round(rev / a.purchasePrice * 100)) : 0 };
  });
  res.json({ monthRevenue: thisMonth.reduce((s, b) => s + net(b), 0), monthBookings: thisMonth.length, utilization, weekly, monthly, perAsset });
});

router.put('/assets/:id/purchase-price', async (req, res) => {
  const a = await Asset.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, { purchasePrice: +req.body.purchasePrice }, { new: true });
  res.json(a);
});
module.exports = router;

const { User, TrustEvent } = require('./models');
exports.haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return +(2 * R * Math.asin(Math.sqrt(a))).toFixed(1);
};
exports.slugify = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
exports.token = () => require('crypto').randomBytes(6).toString('hex').toUpperCase();
exports.publicUser = u => u && ({
  _id: u._id, name: u.name, avatar: u.avatar, bio: u.bio, ratingAvg: u.ratingAvg, ratingCount: u.ratingCount,
  trustScore: u.trustScore, kycStatus: u.kycStatus, avgResponseMinutes: u.avgResponseMinutes, completedCount: u.completedCount,
  accountStatus: u.accountStatus || 'active', createdAt: u.createdAt,
});
exports.selfUser = u => ({ ...exports.publicUser(u), email: u.email, phone: u.phone, role: u.role, walletBalance: u.walletBalance, kycReview: u.kycReview });
// Trust Score = 40% sao + 30% xác minh eKYC + 30% số đơn hoàn tất
exports.recalcTrust = async (userId) => {
  const u = await User.findById(userId);
  if (!u) return;
  const events = await TrustEvent.find({ user: userId, status: 'confirmed' });
  u.trustScore = require('./services/policy').score(u, events.reduce((sum, e) => sum + e.penalty, 0));
  await u.save();
};
// Các ngày đã bị chiếm (bao gồm buffer time)
exports.ACTIVE = ['pending', 'paid', 'picked_up', 'returned', 'disputed'];
exports.dayDiff = (a, b) => Math.max(1, Math.ceil((new Date(b) - new Date(a)) / 86400000));

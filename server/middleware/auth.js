const { User } = require('../models');
// Xác thực dựa trên Session (express-session) – Chương VIII
exports.requireAuth = async (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ message: 'Please sign in first.' });
  req.user = await User.findById(req.session.userId);
  if (!req.user) return res.status(401).json({ message: 'Session expired.' });
  if (req.user.accountStatus === 'suspended') return res.status(403).json({ message: 'Tài khoản đang tạm khóa. Vui lòng liên hệ ShareHub.' });
  next();
};
exports.requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin only.' });
  next();
};

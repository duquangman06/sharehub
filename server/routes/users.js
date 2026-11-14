const router = require('express').Router();
const { User, Review, Asset, TrustEvent } = require('../models');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { selfUser, publicUser } = require('../utils');

router.put('/me', requireAuth, upload.single('avatar'), async (req, res) => {
  const { name, phone, bio } = req.body;
  if (name) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  if (bio !== undefined) req.user.bio = bio;
  if (req.file) req.user.avatar = '/uploads/' + req.file.filename;
  await req.user.save();
  res.json(selfUser(req.user));
});

// eKYC: tải 2 mặt CCCD / hộ chiếu
router.post('/me/kyc', requireAuth, (req, res, next) => { if (['verified','pending'].includes(req.user.kycStatus)) return res.status(409).json({ message: 'Hồ sơ đã xác minh hoặc đang xử lý.' }); next(); }, require('../middleware/kyc-upload').array('docs', 2), async (req, res) => {
  if (req.user.kycStatus === 'verified' || req.user.kycStatus === 'pending') return res.status(409).json({ message: 'Hồ sơ đã xác minh hoặc đang được xử lý.' });
  if (req.body.consent !== 'true') return res.status(400).json({ message: 'Cần đồng ý xử lý giấy tờ.' });
  if (req.files?.length !== 2) return res.status(400).json({ message: 'Vui lòng tải lên đủ ảnh hai mặt giấy tờ.' });
  await require('../services/privacy').protectLegacyDocuments(req.user.kycImages);
  req.user.kycImages = req.files.map(f => '/api/users/me/kyc-documents/' + f.filename);
  req.user.kycConsentAt = new Date();
  req.user.kycStatus = 'pending';
  await req.user.save();
  res.json(selfUser(req.user));
});

router.get('/me/kyc-documents/:file', requireAuth, async (req, res) => {
  const file = req.params.file;
  if (!/^[a-f0-9-]+\.(png|jpg)$/.test(file)) return res.status(404).json({ message: 'Không tìm thấy dữ liệu.' });
  const owner = await User.findOne({ kycImages: '/api/users/me/kyc-documents/' + file });
  if (!owner || (String(owner._id) !== String(req.user._id) && req.user.role !== 'admin')) return res.status(403).json({ message: 'Không có quyền truy cập.' });
  res.set('Cache-Control', 'no-store');
  if (require('../services/file-storage').useMongoFiles()) return require('../services/file-storage').sendFile(req, res, () => res.status(404).json({message:'Không tìm thấy giấy tờ.'}), file, true);
  res.sendFile(require('path').join(__dirname, '..', 'private', 'kyc', file));
});
router.post('/me/trust-events/:id/appeal', requireAuth, async (req, res) => {
  const appeal = String(req.body.appeal || '').trim();
  if (appeal.length < 10) return res.status(400).json({ message: 'Hãy mô tả lý do xem xét (ít nhất 10 ký tự).' });
  const event = await TrustEvent.findOneAndUpdate({ _id: req.params.id, user: req.user._id, status: 'confirmed' }, { appeal: appeal.slice(0,2000), appealAt: new Date() }, { new: true });
  if (!event) return res.status(404).json({ message: 'Không tìm thấy dữ liệu.' });
  res.json({ ok: true });
});
router.get('/:id', async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ message: 'Không tìm thấy thành viên.' });
  const reviews = await Review.find({ to: u._id }).sort('-createdAt').limit(10).populate('from', 'name avatar');
  const assets = await Asset.find({ owner: u._id, status: 'active' }).limit(8);
  const events = await TrustEvent.find({ user: u._id, status: 'confirmed' }).select('kind summary penalty createdAt appealAt').sort('-createdAt').limit(20);
  res.json({ user: publicUser(u), reviews, assets, trustEvents: events });
});

module.exports = router;

const router = require('express').Router();
const { Message, User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
router.use(requireAuth);

router.get('/conversations', async (req, res) => {
  const me = req.user._id;
  const msgs = await Message.find({ $or: [{ from: me }, { to: me }] }).sort('-createdAt').populate('booking', 'status total startDate endDate').populate('asset', 'title images');
  const map = new Map();
  for (const m of msgs) {
    const other = String(m.from) === String(me) ? String(m.to) : String(m.from);
    if (!map.has(other)) map.set(other, { userId: other, last: m, unread: 0, asset: m.asset, booking: m.booking });
    if (String(m.to) === String(me) && !m.read) map.get(other).unread++;
  }
  const users = await User.find({ _id: { $in: [...map.keys()] } }, 'name avatar');
  res.json([...map.values()].map(c => ({ ...c, user: users.find(u => String(u._id) === c.userId) })));
});

router.get('/:userId', async (req, res) => {
  const me = req.user._id, other = req.params.userId;
  await Message.updateMany({ from: other, to: me, read: false }, { read: true });
  const msgs = await Message.find({ $or: [{ from: me, to: other }, { from: other, to: me }] }).sort('createdAt').populate('booking', 'status total startDate endDate').populate('asset', 'title images');
  const user = await User.findById(other, 'name avatar');
  res.json({ user, messages: msgs });
});

router.post('/:userId', upload.single('image'), async (req, res) => {
  if (!req.body.text && !req.file) return res.status(400).json({ message: 'Tin nhắn chưa có nội dung.' });
  const m = await Message.create({ from: req.user._id, to: req.params.userId, text: req.body.text, booking: req.body.booking || undefined,
    asset: req.body.asset || undefined, image: req.file ? '/uploads/' + req.file.filename : undefined });
  res.status(201).json(m);
});

module.exports = router;

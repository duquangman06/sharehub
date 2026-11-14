const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { selfUser } = require('../utils');
const { requireAuth } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password || password.length < 6) return res.status(400).json({ message: 'Thông tin đăng ký chưa hợp lệ.' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'Email này đã được đăng ký.' });
  const user = await User.create({ name, email, phone, password: await bcrypt.hash(password, 10) });
  req.session.userId = user._id;
  res.status(201).json(selfUser(user));
});

router.post('/login', async (req, res) => {
  const { email, password, rememberMe } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.password)))
    return res.status(401).json({ message: 'Email hoặc mật khẩu chưa đúng.' });
  if (user.accountStatus === 'suspended') return res.status(403).json({message:'Tài khoản đang tạm khóa.'});
  req.session.userId = user._id;
  // Remember Me: kéo dài vòng đời cookie session 30 ngày + cookie ghi nhớ email (Chương VIII)
  if (rememberMe) {
    req.session.cookie.maxAge = 30 * 24 * 3600 * 1000;
    res.cookie('sh_email', user.email, { maxAge: 30 * 24 * 3600 * 1000, sameSite: 'lax' });
  } else {
    req.session.cookie.expires = false;
    res.clearCookie('sh_email');
  }
  res.json(selfUser(user));
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => { res.clearCookie('connect.sid'); res.json({ ok: true }); });
});

router.get('/me', async (req, res) => {
  const user = req.session.userId ? await User.findById(req.session.userId) : null;
  res.json({ user: user ? selfUser(user) : null, rememberedEmail: req.cookies.sh_email || '' });
});

module.exports = router;

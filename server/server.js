require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const app = express();
let ready;
async function initialize() {
  if (!ready) ready = mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000, maxPoolSize: 5 }).then(async () => {
    const { Category, User } = require('./models');
    const legacyUsers = await User.find({ kycImages: /^\/uploads\// }).select('kycImages');
    await require('./services/privacy').protectLegacyDocuments(legacyUsers.flatMap(u => u.kycImages));
    if (!process.env.VERCEL && !(await Category.countDocuments())) await require('./seed').run(false);
  }).catch(error => { ready = undefined; throw error; });
  return ready;
}
app.initialize = initialize;
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sharehub';
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);                       // cần khi chạy sau proxy của Render
app.use(morgan('dev'));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(async (req, res, next) => {
  try { await initialize(); next(); }
  catch (error) { console.error('Database initialization failed:', error.name); res.status(503).json({message:'Chưa kết nối được database online. Quản trị viên cần kiểm tra MONGODB_URI.'}); }
});
app.use(session({
  name: 'connect.sid',
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: true,                       // cho phép giỏ/đơn nháp của khách chưa đăng nhập
  store: new (require('./services/lazy-session-store'))(initialize),
  cookie: { httpOnly: true, sameSite: 'lax', secure: isProd },
}));

// Protect legacy ID documents still referenced by older database records.
app.use('/uploads', async (req, res, next) => {
  try {
    const { User } = require('./models');
    const decodedPath = decodeURIComponent(req.path);
    if (!/^\/[^/\\]+$/.test(decodedPath)) return res.status(404).end();
    const owner = await User.findOne({ kycImages: '/uploads' + decodedPath });
    if (owner || await require('./services/privacy').isLegacyDocument('/uploads' + decodedPath)) {
      const viewer = req.session.userId ? await User.findById(req.session.userId) : null;
      if (!viewer || (String(viewer._id) !== String(owner?._id) && viewer.role !== 'admin')) return res.status(403).json({message:'Giấy tờ riêng tư.'});
      res.set('Cache-Control','no-store');
    }
    if (require('./services/file-storage').useMongoFiles()) {
      const viewer = req.session.userId ? await User.findById(req.session.userId) : null;
      req.user = viewer;
      return require('./services/file-storage').sendFile(req, res, () => res.status(404).json({message:'Không tìm thấy ảnh.'}), decodedPath.slice(1));
    }
    next();
  } catch (e) { next(e); }
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/assistant', require('./routes/assistant'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/lender', require('./routes/lender'));
app.use('/api/admin', require('./routes/admin'));
function catchAsync(stack) {
  for (const layer of stack) {
    if (layer.route) catchAsync(layer.route.stack);
    else if (layer.handle?.stack) catchAsync(layer.handle.stack);
    else if (layer.handle?.constructor?.name === 'AsyncFunction') {
      const fn = layer.handle;
      layer.handle = (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
    }
  }
}
catchAsync(app._router.stack);
app.get('/api/health', (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));

// Khi đã build Angular → Express phục vụ luôn SPA (deploy 1 link duy nhất)
const dist = path.join(__dirname, '..', 'client', 'dist', 'client', 'browser');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api|uploads).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => { console.error(err); res.status(err.status || (err.code === 11000 ? 409 : err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500)).json({ message: err.status || err.name === 'ValidationError' ? err.message : 'Yêu cầu không thể xử lý. Vui lòng thử lại.' }); });

module.exports = app;
if (require.main === module) {
  initialize().then(() => app.listen(PORT, () => console.log('ShareHub running on port ' + PORT)))
    .catch(error => { console.error('MongoDB connection failed:', error.name); process.exitCode = 1; });
}

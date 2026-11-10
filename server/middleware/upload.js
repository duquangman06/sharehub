const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dir = path.join(__dirname, '..', 'uploads');
const cloudFiles = require('../services/file-storage');
if (!cloudFiles.useMongoFiles()) fs.mkdirSync(dir, { recursive: true });
const storage = multer.diskStorage({
  destination: dir,
  filename: (req, file, cb) =>
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + path.extname(file.originalname).toLowerCase()),
});
module.exports = multer({
  storage: cloudFiles.useMongoFiles() ? cloudFiles.storage('public') : storage,
  limits: { fileSize: process.env.VERCEL ? 2 * 1024 * 1024 : 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /image\/(jpeg|png|webp|gif)|video\/mp4/.test(file.mimetype)),
});

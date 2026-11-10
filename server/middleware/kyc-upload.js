const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dir = path.join(__dirname, '..', 'private', 'kyc');
const cloudFiles = require('../services/file-storage');
if (!cloudFiles.useMongoFiles()) fs.mkdirSync(dir, { recursive: true });
module.exports = multer({
  storage: cloudFiles.useMongoFiles() ? cloudFiles.storage('private') : multer.diskStorage({ destination: dir, filename: (req, file, cb) => cb(null, require('crypto').randomUUID() + (file.mimetype === 'image/png' ? '.png' : '.jpg')) }),
  limits: { files: 2, fileSize: process.env.VERCEL ? 2 * 1024 * 1024 : 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ['image/jpeg','image/png'].includes(file.mimetype))
});

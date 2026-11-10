const mongoose = require('mongoose');
exports.useMongoFiles = () => process.env.UPLOAD_STORAGE === 'mongodb' || Boolean(process.env.VERCEL);
const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
exports.storage = (visibility = 'public') => ({
  _handleFile(req, file, callback) {
    const filename = require('crypto').randomUUID() + ({'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif','video/mp4':'.mp4'}[file.mimetype] || '');
    const output = bucket().openUploadStream(filename, { metadata: { visibility, owner: String(req.user?._id || ''), contentType: file.mimetype } });
    let settled = false;
    const done = (err, result) => { if (!settled) { settled = true; callback(err, result); } };
    file.stream.on('error', err => { output.destroy(err); done(err); });
    output.on('error', err => done(err));
    output.on('finish', () => done(null, { filename, id: output.id, size: output.length }));
    file.stream.pipe(output);
  },
  _removeFile(req, file, callback) {
    if (!file.id) return callback(null);
    bucket().delete(file.id).then(() => callback(null), callback);
  }
});
exports.sendFile = async (req, res, next, filename, privateOnly = false) => {
  const stored = await mongoose.connection.db.collection('uploads.files').findOne({ filename });
  if (!stored) return next();
  if (privateOnly || stored.metadata?.visibility === 'private') {
    if (!req.user || (req.user.role !== 'admin' && String(req.user._id) !== stored.metadata?.owner)) return res.status(403).json({message:'Giấy tờ riêng tư.'});
    res.set('Cache-Control','no-store');
  } else res.set('Cache-Control','public, max-age=3600');
  res.type(stored.metadata?.contentType || 'application/octet-stream');
  res.set('X-Content-Type-Options','nosniff');
  res.set('Content-Length', String(stored.length));
  const stream = bucket().openDownloadStream(stored._id);
  stream.on('error', error => { if (res.headersSent) res.destroy(error); else next(error); });
  stream.pipe(res);
};

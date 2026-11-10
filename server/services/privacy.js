const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'private', 'legacy-kyc.json');
let protectedPaths = new Set(fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []);
exports.isLegacyDocument = async value => protectedPaths.has(value) || (require('./file-storage').useMongoFiles() && Boolean(await require('mongoose').connection.db.collection('private_upload_paths').findOne({_id:value})));
// Keep the protection even if a rejected ID is later replaced in the user record.
exports.protectLegacyDocuments = async images => {
  if (require('./file-storage').useMongoFiles()) {
    const paths = (images || []).filter(i => typeof i === 'string' && i.startsWith('/uploads/'));
    for (const image of paths) await require('mongoose').connection.db.collection('private_upload_paths').updateOne({_id:image},{$set:{protected:true}},{upsert:true});
    return;
  }
  let changed = false;
  for (const image of images || []) if (typeof image === 'string' && image.startsWith('/uploads/') && !protectedPaths.has(image)) { protectedPaths.add(image); changed = true; }
  if (changed) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = file + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify([...protectedPaths]));
    fs.renameSync(temporary, file);
  }
};

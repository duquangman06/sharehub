const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const {User, Asset, Booking} = require('../models');
const PREFIX='admin-demo-v1';
async function once(Model, key, values) {
  const demoKey=PREFIX+':'+key;
  const found=await Model.findOne({demoKey}); if(found) return found;
  try { return await Model.create({...values,isDemo:true,demoKey}); }
  catch(e) { if(e.code===11000) return Model.findOne({demoKey}); throw e; }
}
async function media(key,file,owner,privateFile=false) {
  const demoKey=PREFIX+':'+key, db=mongoose.connection.db;
  const found=await db.collection('uploads.files').findOne({'metadata.demoKey':demoKey});
  if(found) return (privateFile?'/api/users/me/kyc-documents/':'/uploads/')+found.filename;
  const filename=crypto.createHash('sha256').update(demoKey).digest('hex').slice(0,32)+path.extname(file);
  const bucket=new mongoose.mongo.GridFSBucket(db,{bucketName:'uploads'});
  await new Promise((resolve,reject)=>{
    const stream=bucket.openUploadStream(filename,{metadata:{demoKey,isDemo:true,owner:String(owner),visibility:privateFile?'private':'public',contentType:file.endsWith('.png')?'image/png':'image/jpeg'}});
    stream.on('finish',resolve);stream.on('error',reject);
    fs.createReadStream(path.join(__dirname,'..','demo-assets',file)).on('error',reject).pipe(stream);
  });
  return (privateFile?'/api/users/me/kyc-documents/':'/uploads/')+filename;
}
exports.install = async () => {
  const db=mongoose.connection.db, installs=db.collection('demo_installs');
  const existing=await installs.findOne({_id:PREFIX});
  if(existing?.status==='completed') return {alreadyInstalled:true,source:'MongoDB',...existing.summary};
  const now=new Date(), lease=new Date(Date.now()+5*60000);
  try {
    if(!existing) await installs.insertOne({_id:PREFIX,status:'running',lockedUntil:lease,createdAt:now});
    else {
      const lock=await installs.updateOne({_id:PREFIX,lockedUntil:{$lt:now}},{$set:{status:'running',lockedUntil:lease}});
      if(!lock.modifiedCount) {const e=new Error('Bộ demo đang được tạo. Vui lòng thử lại sau.');e.status=409;throw e;}
    }
  } catch(e) { if(e.code===11000){e.status=409;e.message='Bộ demo đang được tạo ở phiên khác.';}throw e; }
  try {
    await Promise.all([User.init(),Asset.init(),Booking.init()]);
    const password=await bcrypt.hash('123456',10);
    const owners=[];
    for(let i=0;i<2;i++) owners.push(await once(User,'owner-'+i,{name:['Studio Mây (demo)','Góc Cắm Trại Nắng (demo)'][i],email:`admin-demo-owner-${i}@sharehub.invalid`,password,kycStatus:'verified',walletBalance:5000000,bio:'Tài khoản mô phỏng dành cho thực hành quản trị, không phải thành viên thật.',ratingAvg:4.8,ratingCount:6,trustScore:90}));
    const renters=[];
    for(let i=0;i<3;i++) {
      const name=['Nguyễn Mai An (demo)','Trần Hoàng Nam (demo)','Lê Thảo Vy (demo)'][i];
      const u=await once(User,'renter-'+i,{name,email:`admin-demo-renter-${i}@sharehub.invalid`,password,kycStatus:'pending',walletBalance:5000000,trustScore:50,bio:'Hồ sơ hoàn toàn giả lập để trình diễn duyệt và từ chối.'});
      // Only supplement our own incomplete fixture. Never replace a member's documents or a review decision.
      if(u.kycStatus==='pending' && !u.kycImages.length) {
        const images=[];for(const side of ['front','back'])images.push(await media(`kyc-${i}-${side}`,`kyc-${i}-${side}.png`,u._id,true));
        await User.updateOne({_id:u._id,kycStatus:'pending','kycImages.0':{$exists:false}},{$set:{kycImages:images,kycConsentAt:now,kycSubmission:{documentType:i===1?'passport':'cccd',documentNumber:`SH-DEMO-${String(i+1).padStart(3,'0')}`,fullName:name,submittedAt:now}}});
      }
      renters.push(u);
    }
    const sets=[['camera','Máy ảnh Sony A7 IV (demo)','cameras',350000,2000000,owners[0]],['tent','Lều cắm trại 4 người (demo)','camping-gear',180000,600000,owners[1]],['speaker','Loa sự kiện JBL (demo)','speakers-audio',250000,1000000,owners[0]]];
    const assets=[], photos=[];
    for(const [key,title,category,pricePerDay,deposit,owner] of sets) {
      const before=await media(key+'-before',key+'-before.jpg',owner._id);
      const after=await media(key+'-after',key+'-after.jpg',owner._id);
      photos.push([before,after]);
      assets.push(await once(Asset,'asset-'+key,{owner:owner._id,title,slug:'demo-'+key,category,pricePerDay,deposit,purchasePrice:pricePerDay*60,status:'active',condition:95,description:'Thiết bị và ảnh minh họa dùng cho dữ liệu quản trị mô phỏng.',images:[before],accessories:['Bộ phụ kiện mẫu'],location:{lat:10.9574,lng:106.8426,address:'Địa điểm bàn giao mô phỏng, Biên Hòa'},bufferHours:2,delivery:'both'}));
    }
    const reasons=['Người thuê cho rằng máy có vết trầy từ lúc nhận; chủ tài sản đề nghị đối chiếu ảnh.','Hai bên chưa thống nhất chi phí vệ sinh sau khi trả lều.','Người thuê báo thiết bị khác màu và thiếu phụ kiện so với thỏa thuận.'];
    const renterNotes=['Tôi đã ghi nhận vết trầy khi nhận, đề nghị hoàn đủ cọc.','Lều có bùn nhẹ sau chuyến đi; tôi đồng ý chi phí vệ sinh hợp lý.','Tôi nhận một mẫu loa khác với hình và đã báo chủ ngay khi bàn giao.'];
    const ownerNotes=['Tôi đề nghị so sánh hai bộ ảnh trước khi quyết định; không khấu trừ nếu vết trầy đã có sẵn.','Tôi đề xuất khấu trừ 100.000đ cho vệ sinh, phần còn lại hoàn người thuê.','Tôi xác nhận thay mẫu tương đương nhưng chưa thống nhất phụ kiện, đề nghị admin xem xét.'];
    for(let i=0;i<3;i++) {
      const a=assets[i],start=new Date(Date.now()-(7+i)*86400000),end=new Date(+start+2*86400000);
      await once(Booking,'dispute-'+i,{asset:a._id,renter:renters[i]._id,owner:a.owner,startDate:start,endDate:end,days:2,rentalFee:a.pricePerDay*2,deposit:a.deposit,total:a.pricePerDay*2+a.deposit,status:'disputed',paymentStatus:'authorized',handoverAddress:a.location.address,checkinPhotos:[photos[i][0]],checkoutPhotos:[photos[i][1]],checkinAt:start,checkoutAt:end,pickupNote:'Biên bản mô phỏng: đã kiểm tra tài sản và bộ phụ kiện khi nhận.',returnNote:'Biên bản mô phỏng: có khác biệt cần hai bên đối chiếu; chưa tự ý trừ cọc.',dispute:{status:'open',openedBy:renters[i]._id,reason:reasons[i],responses:[{from:renters[i]._id,note:renterNotes[i],photos:[photos[i][0]],at:new Date(+end+3600000)},{from:a.owner,note:ownerNotes[i],photos:[photos[i][1]],at:new Date(+end+7200000)}]}});
    }
    let history=0;
    for(let month=0;month<6;month++)for(let n=0;n<6;n++) {
      const a=assets[n%3],date=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-5+month,2+n));
      const end=new Date(+date+(1+n%3)*86400000);if(end>now)continue;
      const days=1+n%3,rentalFee=a.pricePerDay*days,discount=n===0?Math.round(rentalFee*.1):0;
      await once(Booking,`history-${month}-${n}`,{asset:a._id,renter:renters[n%3]._id,owner:a.owner,startDate:date,endDate:end,days,rentalFee,discount,deposit:a.deposit,total:rentalFee-discount+a.deposit,status:'completed',paymentStatus:'captured',checkinPhotos:[photos[n%3][0]],checkoutPhotos:[photos[n%3][1]],checkinAt:date,checkoutAt:end,pickupNote:'Biên bản mẫu đầy đủ phụ kiện.',returnNote:'Đã trả tài sản, không phát sinh khấu trừ.',createdAt:date,updatedAt:end}); history++;
    }
    const summary={users:5,kyc:3,assets:3,openDisputes:3,historyBookings:history};
    await installs.updateOne({_id:PREFIX},{$set:{status:'completed',completedAt:new Date(),lockedUntil:new Date(0),summary}});
    return {alreadyInstalled:false,source:'MongoDB',...summary};
  } catch(e) {await installs.updateOne({_id:PREFIX},{$set:{status:'incomplete',lockedUntil:new Date(0)}});throw e;}
};

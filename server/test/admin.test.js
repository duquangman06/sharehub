const {test,beforeEach,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const mongoose=require('mongoose');
const models=require('../models');
const router=require('../routes/admin');
const undo=[];let booking,users,audits;
function patch(o,k,f){undo.push([o,k,o[k]]);o[k]=f;}
beforeEach(()=>{
  users={r:{_id:'r',walletBalance:100,completedCount:0,kycStatus:'pending',kycImages:['front','back'],kycConsentAt:new Date(),async save(){}},o:{_id:'o',walletBalance:200,completedCount:0,async save(){}}};
  booking={_id:'b',renter:'r',owner:'o',status:'disputed',deposit:900,rentalFee:200,discount:20,dispute:{status:'open'}};audits=[];
  patch(mongoose.connection,'transaction',async f=>f());
  patch(models.Booking,'findOne',async q=>booking?.status===q.status&&booking.dispute.status===q['dispute.status']?booking:null);
  patch(models.Booking,'findOneAndUpdate',async(q,u)=>{if(booking.status!==q.status)return null;for(const[k,v]of Object.entries(u.$set)){const p=k.split('.');if(p.length===2)booking[p[0]][p[1]]=v;else booking[k]=v;}return booking;});
  patch(models.User,'findById',async id=>users[id]);
  patch(models.User,'findOne',async()=>users.r.kycStatus==='pending'?users.r:null);
  patch(models.User,'findOneAndUpdate',async(q,u)=>{if(users.r.kycStatus!==q.kycStatus)return null;Object.assign(users.r,u.$set);users.r.kycHistory=[...(users.r.kycHistory||[]),u.$push.kycHistory];return users.r;});
  patch(models.User,'updateOne',async(q,u)=>{for(const[k,v]of Object.entries(u.$inc))users[q._id][k]+=v;return {modifiedCount:1};});
  patch(models.TrustEvent,'find',async()=>[]);patch(models.AuditLog,'create',async x=>{audits.push(x);return x;});
});
afterEach(()=>{while(undo.length){const[o,k,v]=undo.pop();o[k]=v;}});
async function call(path,body={},params={id:'b'}){
 const layer=router.stack.find(l=>l.route?.path===path&&l.route.methods.post);
 const req={body,params,user:{_id:'admin',role:'admin'},session:{}};let data,error;
 const res={statusCode:200,status(n){this.statusCode=n;return this;},json(x){data=x;return this;}};
 await layer.route.stack.at(-1).handle(req,res,e=>error=e);return {status:res.statusCode,data,error};
}
test('admin settlement validates refund and reasoning before any financial change',async()=>{
 for(const value of [-1,101,null,'50',NaN])assert.equal((await call('/disputes/:id/resolve',{refundToRenterPercent:value,note:'Căn cứ hợp lệ để đối chiếu.'})).status,400);
 assert.equal((await call('/disputes/:id/resolve',{refundToRenterPercent:50,note:'ngắn'})).status,400);
 assert.equal(users.r.walletBalance,100);assert.equal(users.o.walletBalance,200);assert.equal(audits.length,0);
});
test('settlement preserves deposit total, separates rent and saves the decision and actor',async()=>{
 const r=await call('/disputes/:id/resolve',{refundToRenterPercent:25,note:'Đối chiếu hai ảnh và phản hồi, hoàn một phần cọc.'});
 assert.equal(r.status,200);assert.equal(booking.dispute.refundToRenter,225);assert.equal(booking.dispute.compensationToOwner,675);
 assert.equal(booking.dispute.refundToRenter+booking.dispute.compensationToOwner,900);assert.equal(booking.dispute.rentalReleasedToOwner,180);
 assert.equal(users.r.walletBalance,325);assert.equal(users.o.walletBalance,1055);assert.equal(booking.status,'completed');
 assert.equal(booking.dispute.resolvedBy,'admin');assert(booking.dispute.resolvedAt instanceof Date);assert.equal(audits[0].action,'dispute.resolve');
});
test('repeated settlement cannot credit either wallet twice',async()=>{
 const body={refundToRenterPercent:100,note:'Kiểm tra đủ bằng chứng, hoàn toàn bộ tiền cọc.'};
 assert.equal((await call('/disputes/:id/resolve',body)).status,200);const balances=[users.r.walletBalance,users.o.walletBalance];
 assert.equal((await call('/disputes/:id/resolve',body)).status,409);assert.deepEqual([users.r.walletBalance,users.o.walletBalance],balances);assert.equal(audits.length,1);
});
test('identity approval requires documents and consent; rejection still records a reason',async()=>{
 users.r.kycImages=[];assert.equal((await call('/kyc/:id/:action(approve|reject)',{note:'Chưa có giấy tờ để đối chiếu.'},{id:'r',action:'approve'})).status,400);
 assert.equal((await call('/kyc/:id/:action(approve|reject)',{note:'Thiếu hai ảnh giấy tờ, đề nghị bổ sung.'},{id:'r',action:'reject'})).status,200);
 assert.equal(users.r.kycStatus,'rejected');assert.equal(users.r.kycHistory.length,1);assert.equal(users.r.kycReview.reviewedBy,'admin');
});
test('identity approval persists the review history and rejects a second decision',async()=>{
 const path='/kyc/:id/:action(approve|reject)',body={note:'Thông tin hồ sơ và hai mặt giấy tờ mô phỏng khớp nhau.'};
 assert.equal((await call(path,body,{id:'r',action:'approve'})).status,200);assert.equal(users.r.kycStatus,'verified');assert.equal(users.r.kycHistory[0].status,'verified');
 assert.equal((await call(path,body,{id:'r',action:'reject'})).status,409);assert.equal(users.r.kycHistory.length,1);
});

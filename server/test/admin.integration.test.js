const {test}=require('node:test');
const assert=require('node:assert/strict');
const mongoose=require('mongoose');
const express=require('express');
const {User,Asset,Booking,AuditLog}=require('../models');
const router=require('../routes/admin');

test('Atlas admin integration: persistent KYC, concurrent settlement, history and analytics',{skip:!process.env.MONGO_TEST_URI},async()=>{
 const dbName='sharehub_admin_test_'+require('crypto').randomBytes(8).toString('hex');let server;
 try{
  await mongoose.connect(process.env.MONGO_TEST_URI,{dbName});
  const hello=await mongoose.connection.db.admin().command({hello:1});assert(hello.setName||hello.msg==='isdbgrid');
  const admin=await User.create({name:'Admin test',email:'admin@test.invalid',password:'unused',role:'admin'});
  const renter=await User.create({name:'Renter test',email:'renter@test.invalid',password:'unused',walletBalance:10000,kycStatus:'pending',kycImages:['/fixture/front.png','/fixture/back.png'],kycConsentAt:new Date()});
  const owner=await User.create({name:'Owner test',email:'owner@test.invalid',password:'unused',walletBalance:10000,kycStatus:'verified'});
  const asset=await Asset.create({owner:owner._id,title:'Camera test',category:'cameras',pricePerDay:100,deposit:900,status:'active'});
  const booking=await Booking.create({asset:asset._id,renter:renter._id,owner:owner._id,startDate:new Date(Date.now()-3*86400000),endDate:new Date(Date.now()-86400000),days:2,rentalFee:200,discount:20,deposit:900,total:1080,status:'disputed',dispute:{status:'open',openedBy:renter._id,reason:'Test case only'}});
  const app=express();app.use(express.json());app.use((req,res,next)=>{req.session={userId:req.get('x-test-user')};next();});
  function wrap(stack){for(const l of stack){if(l.route)wrap(l.route.stack);else if(l.handle?.stack)wrap(l.handle.stack);else if(l.handle?.constructor?.name==='AsyncFunction'){const f=l.handle;l.handle=(req,res,next)=>Promise.resolve(f(req,res,next)).catch(next);}}}
  wrap(router.stack);app.use('/api/admin',router);app.use((e,req,res,next)=>res.status(e.status||500).json({message:e.message}));
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const base='http://127.0.0.1:'+server.address().port+'/api/admin';
  async function call(method,path,body,user=admin){const r=await fetch(base+path,{method,headers:{'content-type':'application/json','x-test-user':String(user._id)},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};}
  assert.equal((await call('GET','/stats',null,renter)).status,403);
  const review=await call('POST','/kyc/'+renter._id+'/approve',{note:'Đối chiếu thông tin giả lập và hai ảnh đúng hồ sơ.'});assert.equal(review.status,200);
  const saved=await User.findById(renter._id);assert.equal(saved.kycStatus,'verified');assert.equal(saved.kycHistory.length,1);assert.equal(String(saved.kycReview.reviewedBy),String(admin._id));
  assert.equal((await call('POST','/kyc/'+renter._id+'/reject',{note:'Không được xử lý lại cùng hồ sơ.'})).status,409);
  const payload={refundToRenterPercent:25,note:'Đã đối chiếu biên bản và ý kiến giả lập của hai bên.'};
  const result=await Promise.all([call('POST','/disputes/'+booking._id+'/resolve',payload),call('POST','/disputes/'+booking._id+'/resolve',payload)]);
  assert.equal(result.filter(r=>r.status===200).length,1);assert.equal(result.filter(r=>r.status===409).length,1);
  assert.equal((await User.findById(renter._id)).walletBalance,10225);assert.equal((await User.findById(owner._id)).walletBalance,10855);
  const b=await Booking.findById(booking._id);assert.equal(b.dispute.status,'resolved');assert.equal(b.status,'completed');assert.equal(b.dispute.refundToRenter,225);assert.equal(b.dispute.compensationToOwner,675);assert.equal(String(b.dispute.resolvedBy),String(admin._id));
  assert.equal(await AuditLog.countDocuments({action:'dispute.resolve'}),1);
  const history=await call('GET','/disputes?status=resolved');assert.equal(history.body.length,1);assert.equal(history.body[0].dispute.resolvedBy.name,'Admin test');
  const dashboard=await call('GET','/stats');assert.equal(dashboard.status,200);assert.equal(dashboard.body.finance.settledRevenue,180);assert.equal(dashboard.body.finance.heldDeposits,0);assert.equal(dashboard.body.finance.renterRefunds,225);assert.equal(dashboard.body.finance.ownerCompensation,675);assert.equal(dashboard.body.series.length,6);
 }catch(error){console.error(error);throw error;}finally{
  if(server)await new Promise(resolve=>server.close(resolve));
  try {
   if(mongoose.connection.readyState===1){assert.equal(mongoose.connection.name,dbName);assert(dbName.startsWith('sharehub_admin_test_'));for(const collection of await mongoose.connection.db.collections())await collection.deleteMany({});}
  }finally{await mongoose.disconnect();}
 }
});

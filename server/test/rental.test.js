const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { TERMS, acceptance, validPeriod, score } = require('../services/policy');
const models = require('../models');
const mongoose = require('mongoose');
const router = require('../routes/bookings');
const originals = [];
let state, transactions;
const renter = '000000000000000000000001', owner = '000000000000000000000002', assetId = '000000000000000000000003';
function patch(obj, key, fn) { originals.push([obj,key,obj[key]]); obj[key]=fn; }
beforeEach(() => {
  transactions = 0;
  const start = new Date(Date.now()+86400000), end = new Date(Date.now()+3*86400000);
  state = { start, end, wallet:10000, owner:{_id:owner,kycStatus:'verified',accountStatus:'active'}, asset:{_id:assetId,owner,status:'active',pricePerDay:100,deposit:500,bufferHours:2,blockedRanges:[]}, bookings:[] };
  patch(mongoose.connection,'transaction',async fn => { transactions++; return fn(); });
  patch(models.Asset,'findByIdAndUpdate',async () => state.asset);
  patch(models.Asset,'findById',async () => state.asset);
  patch(models.Booking,'exists',async () => state.busy || false);
  patch(models.Booking,'create',async b => { const copy={...b,_id:'booking'}; state.bookings.push(copy); return copy; });
  patch(models.Booking,'findById',async () => state.booking);
  patch(models.User,'findById',async id => String(id) === owner ? state.owner : {_id:renter,walletBalance:state.wallet});
  patch(models.User,'findOneAndUpdate',async (filter, update) => { if (state.wallet < filter.walletBalance.$gte) return null; state.wallet += update.$inc.walletBalance; return {_id:renter}; });
  patch(models.User,'updateOne',async (filter,update) => { if(String(filter._id) === renter) state.wallet += update.$inc.walletBalance || 0; });
});
afterEach(() => { while(originals.length) {const [o,k,v]=originals.pop();o[k]=v;} });
async function call(path, body={}, extra={}) {
  const route = router.stack.find(l => l.route?.path === path && l.route.methods.post).route;
  const req={body, user:{_id:renter,role:'user'}, session:{draft:{assetId,startDate:state.start.toISOString(),endDate:state.end.toISOString(),expiresAt:Date.now()+60000}},params:{id:'booking'},...extra};
  let data, error;
  const res={statusCode:200,status(n){this.statusCode=n;return this;},json(b){data=b;return this;}};
  await route.stack.at(-1).handle(req,res,e=>{error=e;});
  return {status:res.statusCode,data,error};
}
const agreed = () => ({acceptTerms:true,termsVersion:TERMS.version,paymentMethod:'wallet'});
test('acceptance rejects missing checkbox, string true, and obsolete version',() => {
  for(const body of [{},{acceptTerms:'true',termsVersion:TERMS.version},{acceptTerms:true,termsVersion:'old'}]) assert.throws(()=>acceptance(body,renter),{status:400});
});
test('checkout without consent never debits or creates a booking',async()=>{
  const r=await call('/checkout'); assert.equal(r.error.status,400); assert.equal(state.wallet,10000); assert.equal(state.bookings.length,0);
});
test('checkout records account, timestamp, immutable text and server price',async()=>{
  const r=await call('/checkout',{...agreed(),total:1,deposit:0});
  assert.equal(r.status,201); assert.equal(r.data.total,700); assert.equal(state.wallet,9300);
  assert.equal(r.data.termsAcceptance.user,renter); assert.equal(r.data.termsAcceptance.version,TERMS.version);
  assert.deepEqual(r.data.termsAcceptance.snapshot,TERMS.sections); assert.ok(r.data.termsAcceptance.acceptedAt instanceof Date); assert.equal(transactions,1);
});
test('unconnected payment gateways cannot create unfunded orders',async()=>{
  const r=await call('/checkout',{...agreed(),paymentMethod:'momo'});assert.equal(r.status,400);assert.equal(state.wallet,10000);assert.equal(state.bookings.length,0);
});
test('insufficient funds cannot create a booking',async()=>{
  state.wallet=10;const r=await call('/checkout',agreed());assert.equal(r.status,402);assert.equal(state.bookings.length,0);
});
test('unverified or suspended owners cannot receive bookings',async()=>{
  for(const ownerState of [{kycStatus:'pending'},{kycStatus:'verified',accountStatus:'suspended'}]) {
    state.owner={_id:owner,...ownerState};const r=await call('/checkout',agreed());assert.equal(r.status,403);
  }
  assert.equal(state.wallet,10000);
});
test('blocked asset and conflicting rental are rejected',async()=>{
  state.asset.status='hidden';assert.equal((await call('/checkout',agreed())).status,409);
  state.asset.status='active';state.busy=true;assert.equal((await call('/checkout',agreed())).status,409);
  assert.equal(state.bookings.length,0);
});
test('expired draft cannot charge the wallet',async()=>{
  const r=await call('/checkout',agreed(),{session:{draft:{expiresAt:0}}});assert.equal(r.status,410);assert.equal(state.wallet,10000);
});
test('cancellation refunds once and terminal state rejects repeat',async()=>{
  state.booking={_id:'booking',renter,owner,status:'pending',total:700,async save(){}};
  assert.equal((await call('/:id/cancel')).status,200);assert.equal(state.wallet,10700);
  assert.equal((await call('/:id/cancel')).status,400);assert.equal(state.wallet,10700);
});
test('QR alone without evidence cannot confirm pickup',async()=>{
  state.booking={renter,owner,status:'paid',pickupToken:'ABC',startDate:state.start,endDate:state.end};
  const r=await call('/:id/checkin',{token:'ABC'});assert.equal(r.status,400);assert.equal(state.booking.status,'paid');
});
test('date validation rejects invalid, reversed, past and excessive durations',()=>{
  assert.equal(validPeriod(new Date('invalid'),state.end),false);
  assert.equal(validPeriod(state.end,state.start),false);
  assert.equal(validPeriod(new Date('2020-01-01'),new Date('2020-01-02')),false);
  assert.equal(validPeriod(state.start,new Date(+state.start+367*86400000)),false);
  assert.equal(validPeriod(state.start,state.end),true);
});
test('confirmed violations reduce score and revocation restores it, bounded 0–100',()=>{
  const u={ratingCount:5,ratingAvg:5,kycStatus:'verified',completedCount:10};
  assert.equal(score(u),100);assert.equal(score(u,20),80);assert.equal(score(u,200),0);assert.equal(score(u,0),100);
});
test('transaction failure sends no success response',async()=>{
  patch(mongoose.connection,'transaction',async()=>{throw Error('transaction aborted');});
  const r=await call('/checkout',agreed());assert.match(r.error.message,/aborted/);assert.equal(r.data,undefined);
});

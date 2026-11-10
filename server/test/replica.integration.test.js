const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const { User, Asset, Booking } = require('../models');
const { TERMS } = require('../services/policy');
const router = require('../routes/bookings');
// Explicit opt-in only; never uses the application's database or seed.
test('replica-set integration: concurrent booking and repeated refunds', { skip: !process.env.MONGO_TEST_URI }, async () => {
  const dbName = 'sharehub_test_' + require('crypto').randomBytes(10).toString('hex');
  let server;
  try {
    await mongoose.connect(process.env.MONGO_TEST_URI, { dbName });
    const hello = await mongoose.connection.db.admin().command({hello:1});
    assert.ok(hello.setName || hello.msg === 'isdbgrid', 'Integration test requires replica set/Atlas');
    const owner = await User.create({name:'Test owner',email:'owner@test.invalid',password:'unused',kycStatus:'verified'});
    const renters = await User.create([0,1].map(i=>({name:'Renter '+i,email:i+'@test.invalid',password:'unused',walletBalance:10000})));
    const asset = await Asset.create({owner:owner._id,title:'Test camera',category:'test',pricePerDay:100,deposit:500,status:'active'});
    const sessions = new Map(renters.map(u=>[String(u._id),{userId:String(u._id)}]));
    sessions.set(String(owner._id),{userId:String(owner._id)});
    const app=express();app.use(express.json());app.use((req,res,next)=>{req.session=sessions.get(req.get('x-test-user')) || {};next();});
    // Catch Express 4 async read/auth errors in the same way as production.
    function wrap(stack){ for(const layer of stack){ if(layer.route)wrap(layer.route.stack);else if(layer.handle?.stack)wrap(layer.handle.stack);else if(layer.handle.constructor.name==='AsyncFunction'){const fn=layer.handle;layer.handle=(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);} } }
    wrap(router.stack);app.use('/api/bookings',router);app.use((e,req,res,next)=>res.status(e.status||500).json({message:e.message}));
    server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    const base='http://127.0.0.1:'+server.address().port+'/api/bookings';
    async function post(user,path,body={}){const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json','x-test-user':String(user._id)},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
    const startDate=new Date(Date.now()+86400000).toISOString(),endDate=new Date(Date.now()+3*86400000).toISOString();
    for(const u of renters) assert.equal((await post(u,'/draft',{assetId:asset._id,startDate,endDate})).status,200);
    const results=await Promise.all(renters.map(u=>post(u,'/checkout',{acceptTerms:true,termsVersion:TERMS.version,paymentMethod:'wallet'})));
    assert.equal(results.filter(r=>r.status===201).length,1);
    assert.equal(await Booking.countDocuments(),1);
    const b=await Booking.findOne();const winner=renters.find(u=>String(u._id)===String(b.renter));
    assert.equal((await User.findById(winner._id)).walletBalance,10000-b.total);
    const created=results.find(r=>r.status===201).body;
    assert.equal(created.pickupToken,undefined,'Renter must never receive pickup secret');
    assert.ok(created.returnToken);
    const cancellations=await Promise.all([post(winner,'/'+b._id+'/cancel'),post(winner,'/'+b._id+'/cancel')]);
    assert.equal(cancellations.filter(r=>r.status===200).length,1);
    assert.equal((await User.findById(winner._id)).walletBalance,10000);
    assert.equal((await Booking.findById(b._id)).status,'cancelled');
  } finally {
    if(server)await new Promise(resolve=>server.close(resolve));
    if(mongoose.connection.readyState===1){assert.ok(mongoose.connection.name.startsWith('sharehub_test_'));assert.equal(mongoose.connection.name,dbName);await mongoose.connection.dropDatabase();}
    await mongoose.disconnect();
  }
});

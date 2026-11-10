const {test}=require('node:test');
const assert=require('node:assert/strict');
const {publicUser}=require('../utils');
const {requireAdmin}=require('../middleware/auth');
test('public profiles do not expose ID images, email, phone, wallet or password',()=>{
 const out=publicUser({_id:'id',name:'A',password:'secret',email:'private',phone:'private',walletBalance:99,kycImages:['private.jpg'],kycReview:{note:'private'},kycConsentAt:new Date()});
 for(const key of ['password','email','phone','walletBalance','kycImages','kycReview','kycConsentAt'])assert.equal(out[key],undefined);
});
test('admin APIs reject ordinary members',()=>{
 let status,body,passed=false;
 const res={status(n){status=n;return this;},json(b){body=b;}};
 requireAdmin({user:{role:'user'}},res,()=>passed=true);
 assert.equal(status,403);assert.equal(passed,false);assert.ok(body.message);
 requireAdmin({user:{role:'admin'}},res,()=>passed=true);assert.equal(passed,true);
});

const {test,beforeEach,afterEach}=require('node:test');const assert=require('node:assert/strict');
const models=require('../models');const assistant=require('../services/rental-assistant');
const saved=[];let entries,bookings,query;
function patch(o,k,f){saved.push([o,k,o[k]]);o[k]=f;}
function chain(value){return {select(){return this;},populate(){return this;},sort(){return this;},limit(){return this;},async lean(){return value;}};}
beforeEach(()=>{
 entries=[{_id:'a',title:'Máy ảnh mẫu',category:'cameras',pricePerDay:200000,deposit:500000,images:['/images/cameras/camera.jpg'],owner:{name:'Chủ mẫu',trustScore:90},location:{address:'Biên Hòa, Đồng Nai'},bufferHours:2,blockedRanges:[]}];bookings=[];query=null;
 patch(models.User,'find',f=>{assert.equal(f.kycStatus,'verified');assert.deepEqual(f.accountStatus,{$ne:'suspended'});return chain([{_id:'owner'}]);});
 patch(models.Asset,'find',f=>{query=f;return chain(entries);});patch(models.Booking,'find',()=>chain(bookings));
 saved.push([process.env,'GEMINI_API_KEY',process.env.GEMINI_API_KEY],[process.env,'AI_GATEWAY_API_KEY',process.env.AI_GATEWAY_API_KEY],[process.env,'VERCEL_OIDC_TOKEN',process.env.VERCEL_OIDC_TOKEN]);delete process.env.GEMINI_API_KEY;delete process.env.AI_GATEWAY_API_KEY;delete process.env.VERCEL_OIDC_TOKEN;
});
afterEach(()=>{while(saved.length){const[o,k,v]=saved.pop();if(v===undefined)delete o[k];else o[k]=v;}});
test('assistant rejects arbitrary query operators, impossible dates and invalid budget scopes',()=>{
 const p=assistant.cleanPlan({intent:'delete',reply:'x',filters:{category:{$ne:null},query:{$where:'x'},budget:{amount:100,scope:'all'},startDate:'2026-02-30',durationDays:-1}});
 assert.equal(p.intent,'clarify');assert.equal(p.filters.category,null);assert.equal(p.filters.query,null);assert.equal(p.filters.budget,null);assert.equal(p.filters.startDate,null);assert.equal(p.filters.durationDays,null);
 assert(assistant.dateCheck({startDate:'2020-01-01',endDate:'2020-01-02'}));assert(assistant.dateCheck({startDate:'2026-12-24'}));
});
test('catalog suggestions use verified active owners, never the logged-in user, and calculate prices on the server',async()=>{
 const old=models.User.find;models.User.find=f=>{assert.deepEqual(f._id,{$ne:'renter'});return old(f);};
 const cards=await assistant.retrieve({category:'cameras',durationDays:2,budget:{amount:450000,scope:'rental_total'}},'renter');
 assert.equal(query.status,'active');assert.deepEqual(query.owner,{$in:['owner']});assert.equal(cards[0].rentalFee,400000);assert.equal(cards[0].deposit,500000);assert.equal(cards[0].total,900000);assert.equal(cards[0].availability,'not_checked');assert.equal(cards[0].email,undefined);
});
test('rental-only budget and budget including a deposit are distinct',async()=>{
 assert.equal((await assistant.retrieve({durationDays:2,budget:{amount:450000,scope:'rental_total'}})).length,1);
 assert.equal((await assistant.retrieve({durationDays:2,budget:{amount:450000,scope:'including_deposit'}})).length,0);
});
test('availability respects active booking buffers and maintenance',async()=>{
 const f={startDate:'2026-12-24',endDate:'2026-12-25'};
 bookings=[{asset:'a',startDate:new Date('2026-12-23T12:00Z'),endDate:new Date('2026-12-23T23:00Z')}];
 assert.equal((await assistant.retrieve(f)).length,0);
 bookings=[];entries[0].blockedRanges=[{from:new Date('2026-12-24'),to:new Date('2026-12-26')}];assert.equal((await assistant.retrieve(f)).length,0);
 entries[0].blockedRanges=[];const result=await assistant.retrieve(f);assert.equal(result.length,1);assert.equal(result[0].availability,'checked');
});
test('area and model keywords are matched against catalog data',async()=>{
 assert.equal((await assistant.retrieve({area:'Biên Hòa',query:'máy ảnh'})).length,1);
 assert.equal((await assistant.retrieve({area:'dong nai'})).length,1);
 assert.equal((await assistant.retrieve({area:'Hà Nội'})).length,0);
 assert.equal((await assistant.retrieve({query:'không tồn tại'})).length,0);
});
test('real provider planning carries prior context but cannot set product prices or invent catalog cards',async()=>{
 process.env.GEMINI_API_KEY='test-only';let input;
 const fetcher=async(url,options)=>{assert(url.startsWith('https://generativelanguage.googleapis.com/'));input=JSON.parse(options.body);return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({intent:'search',reply:'Giá 1 đồng',filters:{category:'cameras',durationDays:2,area:'Biên Hòa'}})}]}}]})};};
 const result=await assistant.answer('Hai ngày nhé',{messages:[{role:'user',text:'Tìm máy ảnh'}],filters:{category:'cameras'}},'renter',fetcher);
 assert.equal(result.mode,'ai');assert.equal(result.cards[0].total,900000);assert(!result.text.includes('Giá 1 đồng'));assert(input.contents[0].parts[0].text.includes('Tìm máy ảnh'));
});
test('unavailable AI is explicitly marked basic and does not falsely claim confirmed availability',async()=>{
 const result=await assistant.answer('Thuê máy ảnh 2 ngày',{},null,async()=>{throw Error('Must not call provider without key');});
 assert.equal(result.mode,'basic');assert.equal(result.reason,'not_configured');assert.equal(result.cards[0].availability,'not_checked');assert.match(result.text,/ngày nhận/);
 process.env.GEMINI_API_KEY='test-only';const offline=await assistant.answer('tiền cọc là gì',{},null,async()=>({ok:false,status:429}));assert.equal(offline.mode,'basic');assert.equal(offline.reason,'provider_unavailable');
});
test('invalid dates stop catalog lookup before any availability claim',async()=>{
 const result=await assistant.answer('Thuê máy ảnh từ 2020-01-01 đến 2020-01-03',{});assert.equal(result.cards.length,0);assert.match(result.text,/chưa hợp lệ/);assert.equal(query,null);
});
test('basic mode reads Vietnamese thousands separators without shrinking the budget',()=>{
 assert.equal(assistant.basic('Tìm máy ảnh dưới 500.000đ mỗi ngày').filters.budget.amount,500000);
 assert.equal(assistant.basic('Ngân sách 1,5 triệu cho máy ảnh').filters.budget.amount,1500000);
 assert.equal(assistant.basic('Thuê lều 2 ngày').filters.query,'lều');
});
test('gateway uses only server credentials and keeps them out of returned chat data',async()=>{
 process.env.AI_GATEWAY_API_KEY='server-key-test';
 let authorization;
 const fake=async(url,options)=>{assert.equal(url,'https://ai-gateway.vercel.sh/v1/chat/completions');authorization=options.headers.authorization;return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({intent:'faq',reply:'Tiền cọc tách riêng tiền thuê.',filters:{}})}}]})};};
 const result=await assistant.answer('Tiền cọc là gì?',{},null,fake);
 assert.equal(result.mode,'ai');assert.equal(authorization,'Bearer server-key-test');assert(!JSON.stringify(result).includes('server-key-test'));
});

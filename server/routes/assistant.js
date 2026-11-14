const router=require('express').Router();
const mongoose=require('mongoose');const crypto=require('crypto');
const {User}=require('../models');const assistant=require('../services/rental-assistant');
const chatSchema=new mongoose.Schema({key:{type:String,unique:true},user:{type:mongoose.Schema.Types.ObjectId,ref:'User'},messages:[{role:String,text:String,cards:[mongoose.Schema.Types.Mixed],mode:String,at:Date}],filters:mongoose.Schema.Types.Mixed,lastCards:[mongoose.Schema.Types.Mixed],busyUntil:Date,expiresAt:{type:Date,index:{expireAfterSeconds:0}}},{timestamps:true});
const Chat=mongoose.models.AssistantConversation||mongoose.model('AssistantConversation',chatSchema);
const quotaSchema=new mongoose.Schema({_id:String,count:Number,expiresAt:{type:Date,index:{expireAfterSeconds:0}}});
const Quota=mongoose.models.AssistantQuota||mongoose.model('AssistantQuota',quotaSchema);
router.use(async(req,res,next)=>{
 if(req.get('sec-fetch-site')==='cross-site')return res.status(403).json({message:'Vui lòng mở trợ lý từ website ShareHub.'});
 res.set('Cache-Control','no-store');req.assistantKey=crypto.createHash('sha256').update(req.sessionID+'|'+(req.session.userId||'guest')).digest('hex');
 if(req.session.userId){const u=await User.findById(req.session.userId).select('accountStatus');if(!u||u.accountStatus==='suspended')return res.status(403).json({message:'Phiên đăng nhập không thể sử dụng trợ lý.'});}
 next();
});
router.get('/thread',async(req,res)=>{const c=await Chat.findOne({key:req.assistantKey,expiresAt:{$gt:new Date()}}).lean();res.json({messages:c?.messages||[],configured:!!assistant.provider()});});
router.post('/message',async(req,res)=>{
 const message=typeof req.body?.message==='string'?req.body.message.trim():'';
 if(!message||message.length>1200)return res.status(400).json({message:'Nhập câu hỏi từ 1 đến 1.200 ký tự.'});
 const now=Date.now();const limits=[['session:'+req.assistantKey+':'+Math.floor(now/600000),15],['global:'+new Date().toISOString().slice(0,10),300]];
 for(const [key,limit]of limits){const q=await Quota.findOneAndUpdate({_id:key},{$inc:{count:1},$set:{expiresAt:new Date(now+2*86400000)}},{upsert:true,new:true});if(q.count>limit)return res.status(429).json({message:'Trợ lý đã đạt giới hạn lượt hỏi. Bạn vui lòng thử lại sau hoặc dùng trang Khám phá.'});}
 let c=await Chat.findOne({key:req.assistantKey});
 if(!c){try{c=await Chat.create({key:req.assistantKey,user:req.session.userId||undefined,messages:[],expiresAt:new Date(now+30*86400000)});}catch(e){if(e.code!==11000)throw e;c=await Chat.findOne({key:req.assistantKey});}}
 if(c.expiresAt<=new Date(now))await Chat.updateOne({_id:c._id},{$set:{messages:[],filters:{},lastCards:[]}});
 const locked=await Chat.findOneAndUpdate({_id:c._id,$or:[{busyUntil:{$exists:false}},{busyUntil:{$lte:new Date()}}]},{$set:{busyUntil:new Date(now+45000)}},{new:true});
 if(!locked)return res.status(409).json({message:'Trợ lý đang trả lời câu hỏi trước. Vui lòng đợi một chút.'});
 try{
  const result=await assistant.answer(message,locked.toObject(),req.session.userId);
  const messages=[{role:'user',text:message,at:new Date()},{role:'assistant',text:result.text,cards:result.cards,mode:result.mode,at:new Date()}];
  await Chat.updateOne({_id:c._id},{$set:{filters:result.filters,lastCards:result.cards,expiresAt:new Date(Date.now()+30*86400000)},$push:{messages:{$each:messages,$slice:-30}}});
  res.json(result);
 }finally{await Chat.updateOne({_id:c._id},{$unset:{busyUntil:1}});}
});
module.exports=router;

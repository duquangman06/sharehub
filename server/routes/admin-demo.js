const router=require('express').Router();
// Parent router enforces administrator authentication. GridFS writes deliberately run outside a transaction.
router.post('/setup',async(req,res,next)=>{
  try {
    const result=await require('../services/admin-demo').install();
    if(!result.alreadyInstalled) await require('../models').AuditLog.create({actor:req.user._id,action:'demo.install',target:'admin-demo-v1',note:'Bổ sung bộ hồ sơ, ảnh GridFS, tranh chấp và đơn lịch sử mô phỏng; không xóa dữ liệu cũ.'});
    res.json(result);
  } catch(e){next(e);}
});
module.exports=router;

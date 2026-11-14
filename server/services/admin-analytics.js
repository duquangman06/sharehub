const { User, Asset, Booking, AuditLog } = require('../models');
const net = { $max: [0, { $subtract: [{ $ifNull: ['$rentalFee', 0] }, { $ifNull: ['$discount', 0] }] }] };
const held = ['pending','paid','picked_up','returned','disputed'];
const sum = (rows, id) => rows.find(x => x._id === id)?.count || 0;
exports.dashboard = async (now = new Date()) => {
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()-5, 1));
  const [users, assets, bookings, pendingAssets, pendingKyc, openDisputes, finance, statuses, userStatuses, assetStatuses, monthly, categories, owners, recentBookings, recentActions] = await Promise.all([
    User.countDocuments(), Asset.countDocuments({status:'active'}), Booking.countDocuments(), Asset.countDocuments({status:'pending'}), User.countDocuments({kycStatus:'pending'}), Booking.countDocuments({'dispute.status':'open',status:'disputed'}),
    Booking.aggregate([{$group:{_id:null,
      rentalVolume:{$sum:net}, settledRevenue:{$sum:{$cond:[{$eq:['$status','completed']},net,0]}},
      heldDeposits:{$sum:{$cond:[{$in:['$status',held]},{$ifNull:['$deposit',0]},0]}},
      renterRefunds:{$sum:{$ifNull:['$dispute.refundToRenter',0]}}, ownerCompensation:{$sum:{$ifNull:['$dispute.compensationToOwner',0]}},
      completed:{$sum:{$cond:[{$eq:['$status','completed']},1,0]}}, resolvedDisputes:{$sum:{$cond:[{$eq:['$dispute.status','resolved']},1,0]}},
      demoBookings:{$sum:{$cond:['$isDemo',1,0]}}
    }}]),
    Booking.aggregate([{$group:{_id:'$status',count:{$sum:1}}}]),
    User.aggregate([{$group:{_id:'$kycStatus',count:{$sum:1}}}]),
    Asset.aggregate([{$group:{_id:'$status',count:{$sum:1}}}]),
    Booking.aggregate([{$addFields:{reportDate:{$cond:[{$eq:['$status','completed']},{$ifNull:['$dispute.resolvedAt','$updatedAt']},'$createdAt']}}},{$match:{reportDate:{$gte:first}}},{$group:{_id:{$dateToString:{format:'%Y-%m',date:'$reportDate',timezone:'Asia/Ho_Chi_Minh'}},bookings:{$sum:1},revenue:{$sum:{$cond:[{$eq:['$status','completed']},net,0]}}}},{$sort:{_id:1}}]),
    Booking.aggregate([{$match:{status:'completed'}},{$lookup:{from:'assets',localField:'asset',foreignField:'_id',as:'assetData'}},{$unwind:'$assetData'},{$group:{_id:'$assetData.category',revenue:{$sum:net},count:{$sum:1}}},{$sort:{revenue:-1}},{$limit:8}]),
    Booking.aggregate([{$match:{status:'completed'}},{$group:{_id:'$owner',revenue:{$sum:net},count:{$sum:1}}},{$sort:{revenue:-1}},{$limit:5},{$lookup:{from:'users',localField:'_id',foreignField:'_id',as:'user'}},{$unwind:'$user'},{$project:{revenue:1,count:1,name:'$user.name'}}]),
    Booking.find().select('asset renter owner status total deposit isDemo createdAt').populate('asset','title').populate('renter owner','name').sort('-createdAt').limit(7).lean(),
    AuditLog.find().populate('actor','name').sort('-createdAt').limit(5).lean()
  ]);
  const series = Array.from({length:6},(_,i)=>{
    const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-5+i,1));
    const key=d.toISOString().slice(0,7); const row=monthly.find(x=>x._id===key);
    return {key,label:`Tháng ${d.getUTCMonth()+1}`,revenue:row?.revenue||0,bookings:row?.bookings||0};
  });
  const totals=finance[0]||{};
  return {users,assets,bookings,pendingAssets,pendingKyc,openDisputes,finance:{rentalVolume:totals.rentalVolume||0,settledRevenue:totals.settledRevenue||0,heldDeposits:totals.heldDeposits||0,renterRefunds:totals.renterRefunds||0,ownerCompensation:totals.ownerCompensation||0,completed:totals.completed||0,resolvedDisputes:totals.resolvedDisputes||0,demoBookings:totals.demoBookings||0,completionRate:bookings?Math.round((totals.completed||0)/bookings*100):0},series,statuses,userStatuses,assetStatuses,categories,owners,recentBookings,recentActions,verifiedUsers:sum(userStatuses,'verified'),generatedAt:now,source:'MongoDB',paymentMode:'simulated'};
};

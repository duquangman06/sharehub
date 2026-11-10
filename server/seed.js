// node seed.js  → xoá & nạp dữ liệu mẫu
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Category, Asset, Booking, Review, Message, RentalRequest } = require('./models');
const { slugify } = require('./utils');

const day = n => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d; };

exports.run = async (wipe = true) => {
  if (wipe) await Promise.all([User, Category, Asset, Booking, Review, Message, RentalRequest].map(m => m.deleteMany({})));
  const cats = await Category.insertMany([
    ['Cameras', '📷'], ['Studio Lights', '💡'], ['Drones', '🚁'], ['Speakers & Audio', '🔊'],
    ['Camping Gear', '⛺'], ['Event Tools', '🎪'], ['Study Equipment', '📚'], ['Small Machinery', '🛠️'],
  ].map(([name, icon]) => ({ name, slug: slugify(name), icon })));
  const c = n => slugify(n);

  const pw = await bcrypt.hash('123456', 10);
  const demoAvatars = Array.from({ length: 5 }, (_, i) => `/images/avatars/member-${i + 1}.jpg`);
  const [admin, an, binh, chi, dung, em] = await User.insertMany([
    { name: 'ShareHub Admin', email: 'admin@sharehub.vn', password: await bcrypt.hash('Admin@123', 10), role: 'admin', avatar: demoAvatars[0], kycStatus: 'verified', trustScore: 100 },
    { name: 'Nguyễn Minh An', email: 'an@sharehub.vn', password: pw, phone: '0901234567', avatar: demoAvatars[1], bio: 'Photographer, cho thuê gear máy ảnh & flycam khu Biên Hòa.', kycStatus: 'verified', ratingAvg: 4.9, ratingCount: 24, completedCount: 31, trustScore: 92, avgResponseMinutes: 8 },
    { name: 'Trần Thanh Bình', email: 'binh@sharehub.vn', password: pw, phone: '0912345678', avatar: demoAvatars[2], bio: 'Filmmaker & event crew. Đèn studio, loa, thiết bị sự kiện.', kycStatus: 'verified', ratingAvg: 4.7, ratingCount: 15, completedCount: 18, trustScore: 85, avgResponseMinutes: 15 },
    { name: 'Lê Phương Chi', email: 'chi@sharehub.vn', password: pw, phone: '0923456789', avatar: demoAvatars[3], bio: 'Đam mê outdoor & thiết bị học tập.', kycStatus: 'none', ratingAvg: 4.5, ratingCount: 6, completedCount: 7, trustScore: 58 },
    { name: 'Phạm Quốc Dũng', email: 'dung@sharehub.vn', password: pw, phone: '0934567890', avatar: demoAvatars[4], bio: 'Người thuê thường xuyên.', kycStatus: 'pending', kycImages: [], trustScore: 55 },
    { name: 'Võ Hoàng Em', email: 'em@sharehub.vn', password: pw, phone: '0945678901', avatar: demoAvatars[0], bio: 'Sinh viên làm phim ngắn.', ratingAvg: 4.8, ratingCount: 5, completedCount: 5, trustScore: 70 },
  ]);

  const names = ['Ngọc Anh','Gia Bảo','Minh Châu','Đức Huy','Khánh Linh','Tuấn Kiệt','Phương Mai','Hoàng Nam','Thảo Nhi','Quốc Phong','Hải Quỳnh','Thanh Sơn','Bảo Trân','Nhật Vũ','Thu Hà','Trọng Nghĩa','Yến Nhi','Đình Khang','Mỹ Duyên','Hữu Phước','Kim Ngân','Anh Tú','Lan Vy','Quang Huy','Diệu Linh','Văn Long','Thùy Trang','Đăng Khoa'];
  const extraUsers = await User.insertMany(names.map((name, i) => ({
    name: ` ${name} ${['Nguyễn','Trần','Lê','Phạm','Võ','Đặng','Bùi'][i % 7]}`.split(' ').reverse().join(' '),
    email: `member${String(i + 1).padStart(2, '0')}@sharehub.vn`, password: pw, phone: `09${String(10000000 + i * 1379).slice(0, 8)}`,
    avatar: demoAvatars[i % demoAvatars.length],
    bio: ['Nhiếp ảnh gia tự do, luôn giữ thiết bị sạch và đủ phụ kiện.','Cho thuê đồ camping đã kiểm tra kỹ trước mỗi chuyến đi.','Làm sản xuất nội dung tại TP.HCM, phản hồi nhanh và linh hoạt.','Giảng viên, chia sẻ thiết bị học tập cho cộng đồng.'][i % 4],
    kycStatus: ['verified','verified','pending','none'][i % 4], ratingAvg: +(3.5 + (i % 16) / 10).toFixed(1), ratingCount: 2 + (i * 7) % 35,
    completedCount: (i * 3) % 28, trustScore: 42 + (i * 11) % 57, avgResponseMinutes: 5 + (i * 9) % 65,
  })));

  const L = (lat, lng, address) => ({ lat, lng, address });
  const A = [
    [an, 'Sony A7 IV Mirrorless Camera', 'cameras', 650000, 8000000, 52000000, 98, ['2 pin NP-FZ100', 'Sạc', 'Thẻ nhớ 128GB', 'Dây đeo'], L(10.9574, 106.8426, 'Trung tâm Biên Hòa, Đồng Nai'), 'Full-frame 33MP, quay 4K60. Máy còn rất mới, bảo quản hộp chống ẩm.'],
    [an, 'DJI Mavic 3 Pro Flycam', 'drones', 900000, 12000000, 64000000, 96, ['3 pin', 'Hub sạc', 'Remote RC', 'Túi chống sốc'], L(10.9452, 106.8243, 'P. Tân Phong, Biên Hòa'), 'Flycam 3 camera Hasselblad, bay 43 phút. Cần chứng minh nhân dân khi nhận.'],
    [an, 'Canon EOS R6 Mark II', 'cameras', 600000, 7000000, 58000000, 95, ['Pin LP-E6NH', 'Thẻ SD 64GB'], L(10.9701, 106.8590, 'P. Trảng Dài, Biên Hòa'), 'Lấy nét Dual Pixel cực nhanh, phù hợp chụp sự kiện.'],
    [binh, 'Godox SL-60W Studio Light Kit', 'studio-lights', 180000, 1500000, 6500000, 92, ['Softbox 80cm', 'Chân đèn 2m', 'Remote'], L(10.8231, 106.6297, 'Q. Tân Bình, TP.HCM'), 'Bộ đèn LED 60W cho quay phim & chụp sản phẩm.'],
    [binh, 'Aputure 300D II + Light Dome', 'studio-lights', 450000, 4000000, 28000000, 94, ['Light Dome II', 'Chân đèn nặng'], L(10.7769, 106.7009, 'Q.1, TP.HCM'), 'Đèn cinema 300W chuẩn điện ảnh.'],
    [binh, 'JBL PartyBox 310 Loa Kéo', 'speakers-audio', 350000, 3000000, 14000000, 90, ['Micro không dây x2', 'Dây nguồn'], L(10.8014, 106.7140, 'Q. Bình Thạnh, TP.HCM'), 'Loa 240W, đèn LED, pin 18 giờ. Hoàn hảo cho tiệc ngoài trời.'],
    [binh, 'Sony FX6 Cinema Camera', 'cameras', 1800000, 25000000, 130000000, 97, ['Lens 24-105 G', 'V-mount pin x2', 'Monitor'], L(10.7626, 106.6602, 'Q.10, TP.HCM'), 'Full-frame cinema 4K120. Phù hợp phim ngắn & quảng cáo.'],
    [chi, 'Lều cắm trại Naturehike 4 người', 'camping-gear', 120000, 500000, 3200000, 90, ['Tấm lót', 'Cọc dự phòng'], L(10.9390, 106.8720, 'P. Long Bình, Biên Hòa'), 'Lều 2 lớp chống mưa, lắp trong 5 phút.'],
    [chi, 'Bộ bếp dã ngoại + đèn lồng', 'camping-gear', 80000, 300000, 1800000, 88, ['Bếp gas mini', 'Nồi 3 món', 'Đèn lồng LED'], L(10.9600, 106.8050, 'P. Hố Nai, Biên Hòa'), 'Combo nấu ăn cho nhóm 4–6 người.'],
    [chi, 'Máy chiếu Epson EB-X49', 'study-equipment', 200000, 1500000, 9000000, 93, ['Remote', 'Cáp HDMI', 'Màn chiếu 100"'], L(10.9500, 106.8350, 'P. Quyết Thắng, Biên Hòa'), 'Máy chiếu 3600 lumen cho lớp học, thuyết trình.'],
    [an, 'GoPro Hero 12 Black', 'cameras', 200000, 1500000, 11000000, 96, ['3 pin', 'Gậy tự sướng', 'Vỏ chống nước'], L(10.9650, 106.8480, 'P. Thống Nhất, Biên Hòa'), 'Quay hành trình, du lịch, lặn biển.'],
    [binh, 'Gimbal DJI RS 3 Pro', 'cameras', 250000, 2500000, 16000000, 95, ['Plate Sony', 'Cáp'], L(10.8420, 106.7710, 'TP. Thủ Đức, TP.HCM'), 'Chống rung cho máy tới 4.5kg.'],
    [chi, 'Máy khoan pin Makita + bộ mũi', 'small-machinery', 90000, 500000, 3000000, 85, ['2 pin 18V', 'Bộ mũi 60 chi tiết'], L(10.9300, 106.8200, 'P. An Bình, Biên Hòa'), 'Máy khoan, bắt vít cho việc sửa nhà cuối tuần.'],
    [binh, 'Bộ bàn ghế + bạt sự kiện 3x3', 'event-tools', 220000, 1000000, 7000000, 88, ['Bạt 3x3', '6 ghế', '2 bàn'], L(10.8500, 106.7600, 'Q.9, TP.HCM'), 'Combo tổ chức booth, workshop nhỏ.'],
    [an, 'Tai nghe kiểm âm Sony MDR-7506 + Mic Rode NT1', 'speakers-audio', 150000, 1200000, 7500000, 94, ['Cáp XLR', 'Shock mount'], L(10.9490, 106.8300, 'P. Quang Vinh, Biên Hòa'), 'Combo thu âm podcast/lồng tiếng.'],
  ];
  const generatedTitles = [
    ['Canon EOS R8 + lens 24-105','Sony ZV-E10 Creator Kit','Sigma 24-70mm f/2.8 Art','Ống kính Sony 70-200mm GM II'],
    ['Nanlite Forza 300B + softbox','Godox AD600Pro bộ đèn flash','Aputure Amaran 200x S','Bộ chân đèn C-Stand chuyên nghiệp'],
    ['DJI Mini 4 Pro Fly More Combo','DJI Air 3 Fly More Combo','DJI Avata 2 FPV Combo','Autel EVO Lite+ Premium'],
    ['Rode Wireless PRO Dual','Zoom H6essential Recorder','Shure SM7B + audio interface','Bộ loa JBL EON712 đôi'],
    ['Lều Naturehike Cloud Up 3','Bộ bàn ghế gấp camping cao cấp','Túi ngủ Naturehike -5°C','Bếp dã ngoại Coleman 2 burner'],
    ['Máy phun khói sự kiện 1500W','Bộ micro không dây Sennheiser','Màn chiếu khung 120 inch','Máy tạo bong bóng sân khấu'],
    ['Máy chiếu Epson Full HD 4000lm','iPad Pro 12.9 + Apple Pencil','Bảng vẽ Wacom Intuos Pro L','Màn hình Dell UltraSharp 27 inch'],
    ['Máy rửa xe Bosch UniversalAquatak','Máy khoan bê tông Makita 18V','Máy cắt cỏ chạy pin Makita','Máy hút bụi công nghiệp 30L'],
  ];
  const cities = [
    L(10.9574, 106.8426, 'P. Tân Tiến, Biên Hòa, Đồng Nai'), L(10.7769, 106.7009, 'Q.1, TP.HCM'),
    L(21.0285, 105.8542, 'Q. Hoàn Kiếm, Hà Nội'), L(16.0544, 108.2022, 'Q. Hải Châu, Đà Nẵng'),
    L(10.8014, 106.7140, 'Q. Bình Thạnh, TP.HCM'), L(21.0100, 105.8300, 'Q. Cầu Giấy, Hà Nội'),
  ];
  const categorySlugs = ['cameras','studio-lights','drones','speakers-audio','camping-gear','event-tools','study-equipment','small-machinery'];
  const photoByCategory = {
    cameras: '/images/cameras/camera.jpg', 'studio-lights': '/images/studio-lights/softbox.jpg',
    drones: '/images/drones/drone.jpg', 'speakers-audio': '/images/speakers-audio/audio-mixer.jpg',
    'camping-gear': '/images/camping-gear/tent.jpg', 'event-tools': '/images/speakers-audio/audio-mixer.jpg',
    'study-equipment': '/images/study-equipment/projector.jpg', 'small-machinery': '/images/small-machinery/drill.jpg',
  };
  // Product-specific local photos for the first demo listings; all other seeded items
  // rotate through category-appropriate photos so cards do not repeat one generic image.
  const productPhoto = (title, category, index) => {
    const t = title.toLowerCase();
    if (/sony a7 iv|sony zv-e10/.test(t)) return '/images/products/sony-mirrorless.jpg';
    if (/mavic 3|mini 4 pro|air 3|avata 2/.test(t)) return '/images/products/dji-drone.jpg';
    if (/canon eos r6/.test(t)) return '/images/products/canon-r6.jpg';
    if (/gopro/.test(t)) return '/images/products/gopro-hero.jpg';
    if (/sigma|ống kính|lens/.test(t)) return '/images/products/sigma-lens.jpg';
    if (/jbl partybox|jbl eon|loa kéo/.test(t)) return '/images/products/jbl-speaker-black.jpg';
    if (/loa|jbl|speaker/.test(t)) return '/images/products/jbl-speaker-red.jpg';
    if (/naturehike|lều/.test(t)) return '/images/products/camp-tent-forest.jpg';
    if (/bếp dã ngoại|bếp camping/.test(t)) return '/images/camping-gear/bep.jpg';
    if (/projector|máy chiếu/.test(t)) return '/images/study-equipment/projector.jpg';
    if (/ipad|wacom|màn hình/.test(t)) return '/images/study-equipment/laptop-desk.jpg';
    if (/drill|máy khoan|máy cắt|máy rửa xe|máy hút bụi/.test(t)) return '/images/small-machinery/drill.jpg';
    if (/event|sự kiện|phun khói|bong bóng/.test(t)) return '/images/event-tools/event.jpg';
    if (/godox|aputure|nanlite|studio light|softbox|đèn/.test(t)) return '/images/studio-lights/softbox.jpg';
    if (/jbl|sennheiser|rode|shure|micro|mixer|loa|audio/.test(t)) return '/images/speakers-audio/audio-mixer.jpg';
    const sets = {
      cameras: ['/images/products/sony-mirrorless.jpg', '/images/products/canon-r6.jpg', '/images/products/camera-studio.jpg', '/images/cameras/camera.jpg'],
      drones: ['/images/products/dji-drone.jpg', '/images/products/drone-white.jpg', '/images/drones/drone.jpg'],
      'camping-gear': ['/images/products/camp-tent-day.jpg', '/images/products/camp-tent-yellow.jpg', '/images/products/camp-tent-night.jpg', '/images/camping-gear/tent.jpg'],
      'speakers-audio': ['/images/products/jbl-speaker-black.jpg', '/images/products/jbl-speaker-red.jpg', '/images/speakers-audio/audio-mixer.jpg'],
    };
    const choices = sets[category];
    return choices ? choices[index % choices.length] : photoByCategory[category];
  };
  const owners = [an, binh, chi, ...extraUsers];
  for (let i = 0; i < 80; i++) {
    const group = i % 8, title = generatedTitles[group][Math.floor(i / 8) % 4];
    A.push([owners[(i * 7 + 2) % owners.length], `${title} ${i >= 32 ? `#${String(i + 1).padStart(2, '0')}` : ''}`.trim(), categorySlugs[group],
      [180000, 250000, 320000, 450000, 600000, 850000, 1200000][i % 7], [500000, 1200000, 2500000, 4000000, 7000000][i % 5],
      [5000000, 12000000, 22000000, 38000000, 65000000][i % 5], 78 + (i * 13) % 22,
      [['Pin dự phòng','Sạc chính hãng','Túi đựng'],['Chân đèn','Dây nguồn','Túi chống sốc'],['Pin x3','Hub sạc','Túi đeo'],['Cáp kết nối','Hộp đựng','Hướng dẫn sử dụng']][i % 4],
      cities[i % cities.length], `Thiết bị được vệ sinh và kiểm tra hoạt động trước mỗi lượt thuê. Phù hợp cho ${['dự án cuối tuần','sự kiện gia đình','sản xuất nội dung','công việc chuyên nghiệp'][i % 4]}. Chủ đồ hỗ trợ hướng dẫn sử dụng và bàn giao linh hoạt.`]);
  }
  const assets = await Asset.insertMany(A.map(([owner, title, category, pricePerDay, deposit, purchasePrice, condition, accessories, location, description], index) => ({
    owner: owner._id, title, slug: slugify(title), category, pricePerDay, pricePerHour: Math.round(pricePerDay / 8 / 1000) * 1000, deposit, purchasePrice,
    condition, accessories, location, description, bufferHours: 2, delivery: 'both', status: 'active',
    images: [productPhoto(title, category, index)],
    ratingAvg: 4.3 + Math.random() * 0.7, ratingCount: 3 + Math.floor(Math.random() * 20),
  })));
  assets.forEach(a => a.ratingAvg = +a.ratingAvg.toFixed(1));
  await Promise.all(assets.map(a => a.save()));
  await Asset.create({ owner: chi._id, title: 'Máy ảnh Fujifilm X-T5 (chờ duyệt)', slug: 'fujifilm-x-t5', category: 'cameras', pricePerDay: 500000, deposit: 6000000,
    purchasePrice: 42000000, images: [photoByCategory.cameras], location: L(10.9550, 106.8400, 'Biên Hòa'), status: 'pending', description: 'Thiết bị mới đăng, đang chờ admin kiểm duyệt.' });

  // Đơn mẫu cho Analytics
  const mk = (asset, renter, s, e, status) => {
    const days = Math.max(1, e - s);
    return { asset: asset._id, renter: renter._id, owner: asset.owner, startDate: day(s), endDate: day(e), days, rentalFee: days * asset.pricePerDay,
      deposit: asset.deposit, total: days * asset.pricePerDay + asset.deposit, status, paymentStatus: status === 'completed' ? 'refunded' : 'captured',
      handoverAddress: asset.location.address, pickupToken: 'PICK' + Math.floor(Math.random() * 9000 + 1000), returnToken: 'RTRN' + Math.floor(Math.random() * 9000 + 1000) };
  };
  const bks = [];
  [[-50, -48], [-44, -41], [-37, -35], [-30, -27], [-23, -21], [-16, -13], [-9, -7], [-4, -2]].forEach(([s, e], i) =>
    bks.push(mk(assets[i % 3], i % 2 ? dung : em, s, e, 'completed')));
  bks.push(mk(assets[0], em, 3, 6, 'paid'), mk(assets[1], dung, 8, 10, 'pending'), mk(assets[3], em, 2, 4, 'pending'));
  await Booking.insertMany(bks);
  const allAssets = assets;
  const renters = [dung, em, ...extraUsers];
  const statuses = ['completed','completed','completed','paid','pending','picked_up','returned','rejected','cancelled','disputed'];
  for (let i = 0; i < 39; i++) {
    const booking = mk(allAssets[(i * 11 + 4) % allAssets.length], renters[(i * 5 + 1) % renters.length], -100 + i * 2, -99 + i * 2, statuses[i % statuses.length]);
    if (booking.status === 'disputed') booking.dispute = { openedBy: booking.renter, reason: ['Thiết bị bàn giao khác mô tả','Phát sinh hư hỏng trong thời gian thuê','Hai bên chưa thống nhất khoản đặt cọc'][i % 3], status: i % 2 ? 'open' : 'resolved', refundToRenterPercent: 50, compensationToOwner: 0, adminNote: i % 2 ? '' : 'Đã đối chiếu ảnh bàn giao và thống nhất phương án.' };
    bks.push(booking);
  }
  await Booking.insertMany(bks.slice(11));
  const reviewComments = ['Thiết bị đúng mô tả, chủ đồ hướng dẫn rất nhiệt tình.','Bàn giao đúng giờ, đồ sạch và hoạt động hoàn hảo.','Trải nghiệm thuê thuận tiện, sẽ quay lại lần sau.','Chủ nhà phản hồi nhanh, phụ kiện đầy đủ.','Rất phù hợp cho chuyến đi cuối tuần của gia đình.','Chất lượng tốt, đóng gói cẩn thận.','Giao nhận linh hoạt và chuyên nghiệp.','Giá hợp lý, thiết bị được bảo quản tốt.'];
  const reviews = Array.from({ length: 160 }, (_, i) => {
    const b = bks[i % bks.length];
    const reviewer = i % 2 ? b.owner : b.renter, recipient = i % 2 ? b.renter : b.owner;
    return { booking: b._id, asset: b.asset, from: reviewer, to: recipient, rating: [5,5,4,5,3,4,5][i % 7], comment: reviewComments[i % reviewComments.length] };
  });
  await Review.insertMany(reviews);
  const userRatings = new Map(), assetRatings = new Map();
  reviews.forEach(r => {
    for (const [map, key] of [[userRatings, String(r.to)], [assetRatings, String(r.asset)]]) {
      const v = map.get(key) || { count: 0, sum: 0 }; v.count++; v.sum += r.rating; map.set(key, v);
    }
  });
  await Promise.all([...userRatings].map(([id, v]) => User.updateOne({ _id: id }, { $set: { ratingCount: v.count, ratingAvg: +(v.sum / v.count).toFixed(1) } })));
  await Promise.all([...assetRatings].map(([id, v]) => Asset.updateOne({ _id: id }, { $set: { ratingCount: v.count, ratingAvg: +(v.sum / v.count).toFixed(1) } })));
  const msgs = [];
  for (let i = 0; i < 24; i++) {
    const owner = owners[(i * 3) % owners.length], renter = renters[(i * 7 + 2) % renters.length], asset = allAssets[(i * 5) % allAssets.length];
    msgs.push({ from: renter._id, to: owner._id, asset: asset._id, text: ['Thiết bị còn trống cuối tuần này không ạ?','Mình có thể nhận đồ vào sáng thứ Bảy không?','Cảm ơn bạn, mình đã gửi yêu cầu thuê.','Bạn có thể hướng dẫn nhanh cách sử dụng khi bàn giao không?'][i % 4], read: i % 3 === 0 });
    msgs.push({ from: owner._id, to: renter._id, asset: asset._id, text: ['Chào bạn, đồ vẫn còn lịch nhé.','Được bạn, mình sẽ chuẩn bị đủ phụ kiện.','Mình đã xác nhận, hẹn gặp bạn lúc bàn giao.'][i % 3], read: i % 2 === 0 });
  }
  await Message.insertMany(msgs);
  await RentalRequest.insertMany(Array.from({ length: 12 }, (_, i) => ({ renter: renters[i], title: ['Cần máy ảnh full-frame cho sự kiện','Tìm bộ camping cho 4 người','Cần máy chiếu cho workshop','Thuê flycam quay ngoại cảnh'][i % 4], category: categorySlugs[i % 8], budget: 300000 + i * 50000, dateFrom: day(7 + i), dateTo: day(9 + i), radius: 15, lat: cities[i % cities.length].lat, lng: cities[i % cities.length].lng, details: 'Ưu tiên thiết bị hoạt động tốt, có phụ kiện cơ bản và có thể nhận trực tiếp.', matches: [{ asset: allAssets[i]._id, score: 92 - i, distance: 2.4 + i }] })));
  console.log('🌱 Seed done.\n   admin@sharehub.vn / Admin@123\n   an@sharehub.vn, binh@sharehub.vn, chi@sharehub.vn, dung@sharehub.vn, em@sharehub.vn / 123456');
};

if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sharehub')
    .then(() => exports.run(true)).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

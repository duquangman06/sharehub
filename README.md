# ShareHub – Nền tảng chia sẻ & cho thuê tài sản nhàn rỗi

Full-stack theo đúng môn **Phát Triển Web Doanh Nghiệp Nâng Cao**:
**Angular (SPA)** + **Node.js/Express (RESTful API, MVC)** + **MongoDB (NoSQL)**.

## 1. Chạy trên máy (local)

Yêu cầu: Node.js ≥ 18 và MongoDB **replica set** (Community + Compass) **hoặc** MongoDB Atlas. Các giao dịch tiền cần transaction; xem mục 6.

```bash
# Backend
cd server
cp .env.example .env        # (Windows: copy .env.example .env)
npm install
npm run seed                # nạp dữ liệu mẫu (tuỳ chọn – lần chạy đầu server cũng tự seed)
npm run dev                 # http://localhost:3000

# Frontend (cửa sổ terminal khác)
cd client
npm install
npm start                   # http://localhost:4200  (đã cấu hình proxy /api -> :3000)
```

Tài khoản demo: `admin@sharehub.vn / Admin@123` · `an@sharehub.vn`, `binh@sharehub.vn`, `chi@sharehub.vn`, `dung@sharehub.vn`, `em@sharehub.vn` / `123456`. Seed còn tạo 28 tài khoản thành viên (`member01@sharehub.vn`–`member28@sharehub.vn`, mật khẩu `123456`).

`npm run seed` xóa dữ liệu ShareHub hiện có rồi nạp lại dữ liệu mẫu: 34 người dùng (tính cả admin), 8 danh mục, 95 tài sản đang hoạt động cùng 1 tài sản chờ duyệt, 50 đơn thuê, 160 đánh giá, hội thoại chat và yêu cầu thuê. Như vậy seed có nhiều hơn 50 sản phẩm. Có đủ trạng thái eKYC và trạng thái đơn, gồm một số tranh chấp. Ảnh sản phẩm theo danh mục, ảnh bìa danh mục và avatar mẫu nằm trong `client/public/images/`, được đóng gói cùng client; nguồn ảnh ghi trong `client/IMAGE_CREDITS.md`.

Muốn thay ảnh sau khi đã seed, hãy làm theo [IMAGE_UPDATE_GUIDE.md](IMAGE_UPDATE_GUIDE.md). File ảnh nằm trong thư mục client; MongoDB chỉ lưu đường dẫn ảnh như `/images/cameras/sony-a7-iv.jpg`, không lưu file binary.

Trang chủ lấy tối đa 30 tài sản. Trang Browse mặc định tìm trong bán kính 10 km quanh Biên Hòa nên số kết quả nhỏ hơn tổng 95 tài sản là đúng theo bộ lọc vị trí. Bản đồ dùng OpenStreetMap và có CARTO làm nguồn tile dự phòng; bản đồ cần kết nối Internet để tải tile.

Ảnh seed mới có một số hình gắn đúng model (Sony mirrorless, Canon R6, DJI drone, GoPro, Sigma lens, JBL và lều); các thiết bị còn lại dùng ảnh đúng nhóm sản phẩm. Nguồn ảnh được liệt kê trong `client/IMAGE_CREDITS.md`. Để dữ liệu MongoDB hiện có nhận mapping ảnh seed mới, cần nạp lại seed; lưu ý `npm run seed` xóa toàn bộ dữ liệu ShareHub trước khi tạo lại. Nếu không muốn xóa dữ liệu, thay riêng trường `images` trong Compass theo [hướng dẫn cập nhật ảnh](IMAGE_UPDATE_GUIDE.md). Ảnh do người dùng tải lên hiện lưu trong `server/uploads` nên có thể mất khi Render redeploy; nếu cần lưu bền vững, dùng Cloudinary hoặc object storage và lưu URL trả về vào trường `images`.

## 2. Kết nối MongoDB

### Cách A – MongoDB local (Compass)
1. Cài **MongoDB Community Server** + **MongoDB Compass**.
2. Trong `server/.env`: `MONGODB_URI=mongodb://127.0.0.1:27017/sharehub?replicaSet=rs0` (cần khởi tạo replica set `rs0`)
3. Mở Compass → connect `mongodb://localhost:27017` → thấy database `sharehub` sau khi chạy server.

### Cách B – MongoDB Atlas (bắt buộc khi deploy online)
1. https://www.mongodb.com/cloud/atlas → tạo tài khoản → **Create a free cluster (M0)**.
2. **Database Access** → Add user (username + password, quyền *Read and write to any database*).
3. **Network Access** → Add IP Address → **Allow access from anywhere (0.0.0.0/0)**.
4. **Database → Connect → Drivers** → copy chuỗi dạng  
   `mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/sharehub?retryWrites=true&w=majority`  
   (nhớ thay `<password>` và thêm tên DB `sharehub` trước dấu `?`).
5. Dán vào `MONGODB_URI` trong `server/.env` (local) hoặc Environment Variables trên Render (online).

## 3. Deploy để gửi LINK cho thầy (miễn phí: Render + Atlas)

Server Express phục vụ luôn bản build Angular → **chỉ 1 link duy nhất**.

1. Đẩy toàn bộ thư mục này lên **GitHub** (repo mới).
2. https://render.com → **New → Web Service** → chọn repo.
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Environment: `NODE_ENV=production`, `MONGODB_URI=<chuỗi Atlas>`, `SESSION_SECRET=<chuỗi bất kỳ>`
   (hoặc dùng sẵn `render.yaml`: New → Blueprint).
3. Đợi build xong → Render cấp link `https://sharehub-xxxx.onrender.com` → gửi thầy.
4. Lần chạy đầu server tự seed dữ liệu mẫu nếu DB trống.

Lưu ý: gói free của Render ngủ sau 15 phút không dùng (lần mở đầu mất ~30–50 giây); ảnh seed được phục vụ từ bản build client. Ảnh upload lưu trên đĩa tạm nên sẽ mất khi redeploy.

## 4. Đối chiếu nội dung môn học

| Chương | Thể hiện trong dự án |
|---|---|
| I – Angular/SPA | `client/`, lazy loading mọi trang (`loadComponent`), Angular CLI |
| II – Kỹ thuật cốt lõi | Interpolation, `[property]`, `[class.x]`, `(event)`, `[(ngModel)]`, `@if/@for`, `@Input/@Output` (`shared/ui.ts`: Product Card, Stars, Pagination), Signals |
| III – Services | `core/services.ts`: `AuthService`, `ApiService`, `CatalogService` (`providedIn:'root'`), `HttpClient`, `catchError`, `retry` |
| IV – Routing | `app.routes.ts`: `:id`, query params `/search?category=…`, nested `/lender/*` & `/admin/*`, lazy, `CanActivate` (`core/guards.ts`), `**` → 404 |
| V – Forms | `pages/auth.ts`: Reactive Forms, custom validator (độ mạnh mật khẩu), cross-field (khớp mật khẩu) ; `asset-form.ts` |
| VI – RESTful API | `server/routes/*`: Express, Morgan, CORS, Multer upload, GET/POST/PUT/DELETE, proxy dev |
| VII – MongoDB | `server/models/index.js` (Mongoose), 7 collections, text + compound index, Atlas/Replica Set |
| VIII – Cookies & Sessions | `express-session` + `connect-mongo`, cookie `connect.sid`, Remember Me (cookie `sh_email`), **đơn nháp trong Session → ghi vào MongoDB khi thanh toán** (`routes/bookings.js`) |

## 5. 13 màn hình theo file INTERFACE
Login/Register · Profile & Trust Score & eKYC · Home · Search + Leaflet map · Asset detail + dynamic calendar · Checkout & Escrow (đếm ngược 15 phút) · Booking detail & QR handover · Post-need radar matching · Asset form (buffer time, pin bản đồ) · Lender calendar & orders · Analytics & ROI · Realtime chat (polling 3s) · Admin & Dispute room.

## 6. Nâng cấp quản trị & thuê an toàn (10/11/2026)

Đã bổ sung quản lý thành viên/đơn thuê/vi phạm uy tín/báo cáo/nhật ký; điều khoản có lưu phiên bản; ảnh và biên bản bàn giao; quyền riêng tư giấy tờ; logo vector và banner mới. Xem [báo cáo nâng cấp và hướng dẫn kiểm tra](docs/SHAREHUB_UPGRADE.md).

**Cấu hình mới cần MongoDB replica set hoặc Atlas để chạy các giao dịch tiền nguyên tử.** Bản nháp 15 phút không phải khóa lịch độc quyền. Thanh toán chỉ dùng ví mô phỏng; chưa kết nối MoMo/VNPay/CIC/eKYC tự động. Tin đăng mới luôn chờ admin duyệt, kể cả chủ đã xác minh.

Chạy kiểm thử: `npm --prefix server test`. Test tích hợp chỉ chạy khi đặt `MONGO_TEST_URI` trỏ tới replica set và sử dụng database tạm riêng; không seed lại dữ liệu hiện có.

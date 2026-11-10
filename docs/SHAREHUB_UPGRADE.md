# Nâng cấp ShareHub — 10/11/2026

## Đối chiếu với midterm

Đã đọc mã nguồn trong ba ZIP `my-app-*` của bài midterm; không sửa hoặc nạp lại dữ liệu bài thi. Bản midterm có quản trị sản phẩm, đơn hàng có phân trang, chuyển trạng thái hợp lệ, soft delete, thống kê đơn Completed và kiểm thử hoàn kho nhiều lần. ShareHub đã có nghiệp vụ riêng phong phú hơn (eKYC, QR, cọc, tranh chấp), nhưng còn thiếu các hàng rào kiểm soát tương đương.

| Học từ midterm | Bổ sung cho ShareHub |
|---|---|
| Danh sách đơn có phân trang | Quản lý toàn bộ đơn thuê, lọc trạng thái, mở hồ sơ giao dịch |
| Quản trị sản phẩm, soft delete | Lọc tin đăng pending/active/hidden/rejected; ẩn, yêu cầu duyệt lại; chủ ẩn thay vì xóa tài sản trong đơn cũ |
| Kiểm soát trạng thái và hoàn kho lặp | Transaction cho tạo đơn, trừ ví, hoàn tiền, hoàn cọc và giải quyết tranh chấp; ghi khóa tài sản để chống đặt trùng khi đồng thời |
| Thống kê đơn Completed | Báo cáo tiền thuê đã hoàn tất, loại trừ cọc; top thành viên theo số đơn hoàn tất |
| Phân quyền và test nghiệp vụ | Khóa tài khoản, kiểm tra quyền phía API, tài liệu và bộ kiểm thử thuê–trả |

## Chức năng đã triển khai

Vào **Admin → Thành viên, đơn & uy tín**:

- Thành viên: tìm tên/email, lọc xác minh, phân trang, tạm khóa/mở khóa kèm lý do. Không khóa tài khoản admin.
- Đơn thuê: xem toàn bộ trạng thái, tài sản, người thuê/chủ, số tiền, cọc, phiên bản điều khoản; mở chi tiết để kiểm tra bằng chứng.
- Uy tín & vi phạm: ghi nhận vi phạm gắn đúng người trong đơn, mức trừ 1–30, tóm tắt công khai và căn cứ riêng tư. Trả trễ phải có thời gian trả thực tế sau hạn; các vi phạm khác yêu cầu tranh chấp đã xử lý. Không trừ lặp cùng người–đơn–loại vi phạm đang hiệu lực.
- Người dùng xem lịch sử tại hồ sơ công khai; chủ tài khoản gửi yêu cầu xem xét lại. Admin có thể hủy vi phạm với lý do, tự tính lại điểm.
- Báo cáo và nhật ký: doanh số tiền thuê đã hoàn tất, top 5 thành viên; nhật ký xác minh, khóa tài khoản, tin đăng, vi phạm và xử lý tranh chấp (100 mục gần nhất).

Vào **Admin → Moderation & eKYC**: quản lý tin đăng theo trạng thái; xem hai ảnh giấy tờ; duyệt/từ chối với ghi chú. Đây là **đối chiếu thủ công**, chưa phải xác thực với cơ sở dữ liệu dân cư hay xác thực chip CCCD.

Điểm ShareHub = đánh giá tối đa 40 + xác minh thủ công 30 + lịch sử hoàn tất tối đa 30 − các vi phạm đã xác nhận, giới hạn 0–100. Chưa có đánh giá được 20 điểm phần đánh giá. Không tự động gán người điểm thấp là gian lận; chủ đọc bằng chứng công khai và quyết định nhận đơn.

## Luồng thuê–trả

1. Chủ gửi tin có giá thuê, cọc riêng từng tài sản, phụ kiện, địa chỉ và thời gian đệm; admin kiểm duyệt. Chỉnh sửa tin đang hoạt động cần duyệt lại.
2. Người thuê xem lịch, hồ sơ và uy tín. Bản nháp tồn tại 15 phút, **không độc quyền giữ lịch**; hệ thống kiểm tra lịch lần nữa khi thanh toán.
3. Checkout tải điều khoản từ server, hiển thị trách nhiệm bảo quản, giao–trả, cọc, bồi thường, hủy/hoàn tiền, tranh chấp và dữ liệu. Bắt buộc tích đồng ý. Server kiểm tra đúng phiên bản rồi lưu người đồng ý, thời gian server, phiên bản và toàn văn cùng đơn.
4. Thanh toán bằng ví mô phỏng. Server tự tính tiền; không tin tổng tiền gửi từ client. Chặn VNPay/MoMo/thẻ chưa kết nối, không tạo đơn không được cấp tiền.
5. Chủ phải đã được xác minh, tài khoản hoạt động. Chủ xem hồ sơ người thuê và chấp nhận/từ chối; từ chối hoặc người thuê hủy trước nhận được hoàn toàn bộ vào ví demo.
6. Khi giao: người thuê nhập mã của chủ; phải đang trong thời gian thuê, có ít nhất một ảnh và biên bản serial/phụ kiện/hiện trạng. Không nhận chỉ bằng mã QR.
7. Khi trả: chủ nhập mã của người thuê, chụp ảnh đối chiếu và ghi biên bản. Chủ xác nhận không có vấn đề mới hoàn cọc; tiền thuê trả cho chủ. Mã nhận chỉ trả cho chủ, mã trả chỉ trả cho người thuê trong API giao dịch.
8. Nếu có sự cố: mở tranh chấp, giữ cọc; hai bên gửi phản hồi và tối đa 4 ảnh mỗi lần (20 phản hồi/đơn). Admin xem ảnh trước/sau và phản hồi; quyết định tỷ lệ hoàn cọc, ghi căn cứ. Không tự khấu trừ cọc ngoài quy trình này.
9. Hoàn tất, đánh giá chéo; admin xác nhận vi phạm có căn cứ nếu cần. Điểm và lưu ý xuất hiện trên hồ sơ, có cơ chế phản hồi/hủy vi phạm.

Điều khoản là nội dung nghiệp vụ mẫu cho đồ án; chưa phải hợp đồng đã được tư vấn pháp lý. Hiện bồi thường mô phỏng giới hạn trong số cọc giữ; chưa có tính phí trả trễ tự động, bảo hiểm, chữ ký số hoặc thanh toán/escrow thực.

## CCCD và phương án tích hợp

Ảnh CCCD mới nằm ở `server/private/kyc`, tải qua API kiểm tra đúng chủ tài khoản hoặc admin, `Cache-Control: no-store`. Ảnh cũ đang được database gắn làm giấy tờ tại `/uploads` cũng có lớp kiểm tra quyền (kể cả tên file URL-encoded). Hồ sơ công khai không trả ảnh CCCD, điện thoại, email, số dư, căn cứ riêng tư hay ghi chú đối chiếu.

Đề xuất giai đoạn tiếp theo: OCR giấy tờ + selfie + liveness + face matching, đối chiếu kết quả ở backend; nhà cung cấp chỉ trả kết quả xác minh danh tính. Cần tài khoản/hợp đồng và cấu hình chính thức của nhà cung cấp. Chưa gửi giấy tờ của dự án tới dịch vụ ngoài.

- [FPT.AI: luồng eKYC, liveness và face matching](https://docs-vision.fpt.ai/en/ekyc/III-integration/III-2-APIs/a-APIs%20of%20eKYC%20Flows/APIs-in-money-transfer-flow/) — có API yêu cầu API key.
- [CAKE: eKYC overview](https://developer.cake.vn/identity/ekyc/) — tài khoản tenant và thông tin xác thực được cấp trước khi tích hợp.
- [CIC: mẫu báo cáo tín dụng thể nhân](https://cic.gov.vn/files/content/ratting/maubaocao/BaoCaoTinDungTheNhanK11.pdf) — điểm được đánh giá từ dữ liệu quan hệ tín dụng. Không dùng điểm đó làm kết luận về hành vi thuê đồ. Chưa tích hợp CIC, chưa có căn cứ quyền truy cập để thực hiện tra cứu cho marketplace này.

Trước vận hành thật: bổ sung lưu trữ riêng được mã hóa, vòng đời lưu/xóa hồ sơ, kiểm soát truy cập chi tiết, giám sát truy cập giấy tờ, hợp đồng nhà cung cấp và quy trình hỗ trợ phản hồi. Tất cả ảnh upload hiện còn lưu trên đĩa; cần private object storage để bền vững khi deploy.

## Chạy và kiểm tra

**Yêu cầu mới: MongoDB replica set hoặc MongoDB Atlas cho transaction.** MongoDB standalone không đáp ứng tính nguyên tử nhiều document. Không tự reset hay seed lại database hiện có.

Ví dụ local (dùng database hiện tại của bạn trong một replica set được thiết lập đúng):

```powershell
# Khởi tạo một replica set local mới với thư mục dữ liệu riêng khi cần:
# mongod --replSet rs0 --dbpath <thu-muc-du-lieu-rieng> --bind_ip 127.0.0.1
# mongosh --eval 'rs.initiate()'
# server/.env:
# MONGODB_URI=mongodb://127.0.0.1:27017/sharehub?replicaSet=rs0
npm --prefix client run build
npm --prefix server test
npm start
```

Test tích hợp opt-in tạo database tạm có prefix `sharehub_test_`, kiểm tra đặt đồng thời/hoàn tiền lặp và tự xóa **chỉ database tạm đó**:

```powershell
$env:MONGO_TEST_URI='mongodb://127.0.0.1:27017/?replicaSet=rs0'
npm --prefix server test
```

Kết quả trong phiên nâng cấp: Angular build thành công; 15 test nghiệp vụ/quyền riêng tư dùng model giả lập chạy qua. Test replica set tự bỏ qua khi chưa có `MONGO_TEST_URI`. Máy hiện không có MongoDB tại `127.0.0.1:27017`, nên chưa xác nhận tích hợp database thật, thao tác đồng thời thật và toàn bộ UI với dữ liệu đang lưu. Build còn cảnh báo CommonJS của Leaflet có sẵn.

## Bộ nhận diện

- `client/public/brand/sharehub-mark-v2.svg`: vẽ lại logo vector ngôi nhà và hai nút chia sẻ theo ảnh tham khảo; nét ở mọi độ phóng đại, dùng trên thanh điều hướng.
- `client/public/brand/sharehub-hero-v2.png`: banner mới, tạo bằng **built-in image_gen**, dùng ở trang chủ; không ghi chữ vào ảnh để tiêu đề HTML luôn rõ và responsive.
- Prompt tạo banner: “Use case: ads-marketing. Create a premium wide website hero background for ShareHub, a Vietnamese peer-to-peer equipment rental platform. Navy midnight background, luminous emerald green and azure blue accents matching a house-and-sharing brand mark. Elegant realistic 3D still life of mirrorless camera, camera lens, portable speaker, camping tent miniature, and subtle shield/check and interconnected nodes suggesting trusted sharing. Objects mostly on right half; left half calm dark negative space for live HTML headings. Sophisticated studio lighting, crisp edges, restrained glow, visually polished professional fintech-meets-sharing marketplace. Landscape 3:2 or wider. No letters, no text, no watermark, no fake screenshots.”

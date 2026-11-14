# Quản trị ShareHub và dữ liệu MongoDB

## Thao tác trên website

- `/admin/moderation`: chọn hồ sơ, mở hai ảnh giấy tờ, nhập căn cứ tối thiểu 10 ký tự rồi duyệt hoặc từ chối. Các bộ lọc tách hàng chờ và hồ sơ đã xử lý. Lịch sử ghi trạng thái, lý do, thời điểm và tài khoản quản trị.
- `/admin/disputes`: xem người thuê, chủ tài sản, cọc, lý do, ảnh nhận/trả và phản hồi hai bên. Chọn tỷ lệ hoặc nhập số tiền hoàn, nhập căn cứ, xem lại rồi xác nhận. Hồ sơ đã giải quyết chỉ hiển thị kết quả; API chặn phân bổ lần hai.
- `/admin/overview`: tổng hợp số liệu trực tiếp từ MongoDB, biểu đồ sáu tháng, trạng thái đơn, nhóm thiết bị, chủ tài sản, hàng chờ, đơn và nhật ký gần đây. Nút làm mới đọc lại dữ liệu từ máy chủ.

## Dữ liệu minh họa

Bộ `admin-demo-v1` bổ sung riêng 5 tài khoản, 3 thiết bị, 3 hồ sơ CCCD/hộ chiếu giả lập, 3 tranh chấp có bằng chứng minh họa và tối đa 36 đơn hoàn tất trong sáu tháng. Tất cả mang `isDemo: true` và khóa `demoKey`; không thay thế dữ liệu thành viên hiện có. Giấy tờ hiển thị dấu DEMO, dùng mã SH-DEMO thay cho số giấy tờ thật. Ảnh thiết bị chỉ minh họa, không phải bằng chứng của vụ việc thật.

Quản trị viên có thể bấm **Bổ sung bộ demo** hoặc chạy `npm --prefix server run seed:admin-demo` với `server/.env` đã cấu hình. Bộ cài có khóa và chạy lại không đặt lại các quyết định đã lưu. Không cần tạo lại dữ liệu khi triển khai Vercel.

## Bằng chứng lưu trữ

| Collection | Nội dung |
|---|---|
| `users` | Hồ sơ, đường dẫn ảnh, đồng ý xử lý, `kycSubmission`, `kycReview`, `kycHistory`, ví mô phỏng |
| `assets` | Thiết bị, người sở hữu, giá và tiền cọc |
| `bookings` | Giao dịch, ảnh nhận/trả, phản hồi; `dispute.adminNote`, `resolvedBy`, `resolvedAt`, số tiền hoàn/bồi thường |
| `auditlogs` | Người thao tác, hành động, đối tượng, căn cứ và thời điểm |
| `uploads.files`, `uploads.chunks` | Nội dung 12 ảnh demo bằng GridFS, không chỉ đường dẫn tạm trên Vercel |
| `demo_installs` | Phiên bản, trạng thái và kết quả cài dữ liệu demo |

Giấy tờ được phục vụ qua API riêng tư, giới hạn chủ hồ sơ và quản trị viên. Giao diện không dùng localStorage để lưu hồ sơ hoặc quyết định.

## Công thức và tính nhất quán

- Tiền thuê thuần = tiền thuê trừ giảm giá, tối thiểu 0; tiền thuê hoàn tất chỉ lấy đơn `completed`. Đây là tiền thuê của giao dịch, không phải phí/doanh thu riêng của nền tảng.
- Cọc hoàn người thuê = làm tròn(cọc × tỷ lệ / 100). Bồi thường từ cọc cho chủ = cọc trừ phần hoàn. Chủ nhận thêm tiền thuê thuần, tách khỏi cọc.
- Chuyển trạng thái, cập nhật hai ví, điểm uy tín và nhật ký nằm trong một MongoDB transaction. Điều kiện trạng thái ngăn xác nhận lặp; MongoDB xử lý xung đột đồng thời.
- Dashboard thể hiện rõ ví/giao dịch mô phỏng và số đơn demo. Không có thanh toán tiền thật hay tra cứu CCCD nhà nước trong chức năng này.

## Kiểm tra

`npm --prefix server test` kiểm tra quyền admin, xác minh, phân bổ cọc, chống xử lý lặp và các luồng thuê hiện có. `server/test/admin.integration.test.js` chạy khi có `MONGO_TEST_URI`: tạo database kiểm thử riêng với hậu tố ngẫu nhiên, kiểm tra lưu KYC, hai yêu cầu giải quyết đồng thời, ví, lịch sử, audit và dashboard bằng dữ liệu thật trên MongoDB; dọn các document kiểm thử sau khi chạy. Không chạy trên database nghiệp vụ.

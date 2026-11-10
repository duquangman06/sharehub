# Cách thay ảnh sản phẩm sau khi đã seed

> **Không tải file ảnh vào MongoDB.** Hãy để file trong thư mục ảnh tĩnh của Angular, còn MongoDB chỉ lưu đường dẫn ảnh trong trường `images`.

## Cách cập nhật một sản phẩm hiện có bằng MongoDB Compass

1. Tải ảnh sản phẩm bạn có quyền sử dụng, ưu tiên JPG hoặc WebP và giảm kích thước khoảng 400–600 KB.
2. Chép file vào thư mục phù hợp, ví dụ `client/public/images/cameras/sony-a7-iv.jpg`. Thư mục `client/public` được phục vụ như thư mục gốc `/` của website.
3. Mở MongoDB Compass → database `sharehub` → collection `assets`.
4. Tìm đúng sản phẩm theo `title` hoặc `_id`, chọn **Edit Document**.
5. Đặt trường `images` thành mảng chứa đường dẫn tĩnh, ví dụ:

   ```json
   "images": ["/images/cameras/sony-a7-iv.jpg"]
   ```

6. Lưu document. Nếu đang chạy `npm start` trong `client`, tải lại trang. Khi deploy, commit/deploy cả file ảnh trong `client/public/images/`; ảnh sẽ được chép vào bản build và Express phục vụ cùng ứng dụng.

### Sau khi đã seed dữ liệu

Seed không chạy lại mỗi khi khởi động nếu database đã có danh mục. Nếu bạn thêm/thay ảnh sau seed, không cần seed lại: chỉ chép file vào `client/public/images/`, sửa `images` trong document Compass theo đúng URL (ví dụ `/images/products/sony-mirrorless.jpg`), rồi tải lại trang. Khi chạy production/Render, cần build và deploy lại client cùng file ảnh. MongoDB không chứa file ảnh và việc sửa trường `images` không tự tải ảnh lên server.

Để xem nhanh đường dẫn có truy cập được không, mở trực tiếp `http://localhost:4200/images/products/sony-mirrorless.jpg`. Nếu ảnh không mở, kiểm tra chính tả/tên file và vị trí trong `client/public/images/` trước khi kiểm tra document.

## Để ảnh vẫn được gắn sau lần seed kế tiếp

Sửa map `photoByCategory` trong `server/seed.js` hoặc đặt điều kiện theo tên sản phẩm ở phần tạo `Asset`, dùng đường dẫn bắt đầu bằng `/images/`. Ví dụ:

```js
  images: ['/images/products/sony-mirrorless.jpg']
```

Sau đó chạy `npm run seed` từ thư mục gốc. Lệnh này xóa và tạo lại dữ liệu mẫu; nếu chỉ muốn thay ảnh của các record hiện có, dùng MongoDB Compass theo các bước ở trên và **không** chạy seed lại.

## Ảnh người dùng tải lên

Ảnh trong `client/public/images/` phù hợp với ảnh mẫu cố định của dự án. Với ảnh người dùng tự tải lên sau khi ứng dụng chạy, nên dùng Cloudinary hoặc object storage. Lưu URL HTTPS do dịch vụ trả về vào mảng `images`; không lưu binary ảnh trực tiếp trong document MongoDB. Cách này tránh mất ảnh upload khi Render thay đĩa tạm lúc deploy lại.

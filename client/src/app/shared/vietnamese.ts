import { Pipe, PipeTransform } from '@angular/core';

/** Display labels only. Stored/API status values remain unchanged. */
export const VI_LABELS: Record<string, string> = {
  pending: 'Chờ duyệt', paid: 'Đã duyệt · chờ nhận', picked_up: 'Đang thuê', returned: 'Đã trả · chờ hoàn tất', completed: 'Hoàn tất',
  rejected: 'Đã từ chối', cancelled: 'Đã hủy', disputed: 'Đang tranh chấp', active: 'Đang hoạt động', hidden: 'Đã ẩn',
  none: 'Chưa xác minh', verified: 'Đã xác minh', suspended: 'Tạm khóa', confirmed: 'Đã xác nhận', revoked: 'Đã hủy vi phạm',
  open: 'Đang xử lý', resolved: 'Đã xử lý', pickup: 'Nhận trực tiếp', delivery: 'Giao tận nơi', both: 'Nhận trực tiếp hoặc giao tận nơi',
  late_return: 'Trả tài sản trễ', damage: 'Hư hỏng tài sản', nonpayment: 'Vi phạm thanh toán', other: 'Vi phạm khác',
  'listing.approve': 'Duyệt tin đăng', 'listing.reject': 'Từ chối tin đăng', 'trust.create': 'Xác nhận vi phạm', 'user.status': 'Cập nhật trạng thái tài khoản', 'kyc.approve': 'Duyệt hồ sơ', 'kyc.reject': 'Từ chối hồ sơ',
  'trust.confirm': 'Xác nhận vi phạm', 'trust.revoke': 'Hủy vi phạm', 'dispute.resolve': 'Xử lý tranh chấp', 'listing.status': 'Cập nhật tin đăng',
};
export const VI_CATEGORIES: Record<string, string> = {
  cameras: 'Máy ảnh', 'camping-gear': 'Đồ cắm trại', drones: 'Máy bay mini', 'event-tools': 'Thiết bị sự kiện',
  'small-machinery': 'Dụng cụ & máy móc', 'speakers-audio': 'Loa & âm thanh', 'studio-lights': 'Đèn phòng chụp', 'study-equipment': 'Thiết bị học tập',
};
@Pipe({ name: 'vi', standalone: true, pure: true })
export class VietnamesePipe implements PipeTransform {
  transform(value: unknown): string { const key = String(value ?? ''); return VI_LABELS[key] || key; }
}

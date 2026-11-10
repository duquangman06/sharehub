const TERMS = Object.freeze({
  version: 'SH-2026-11-v1',
  title: 'Điều khoản thuê tài sản ShareHub',
  sections: [
    'Sử dụng đúng mục đích, không cho thuê lại hoặc chuyển giao tài sản khi chưa có sự đồng ý của chủ tài sản.',
    'Người thuê bảo quản tài sản và phụ kiện; hai bên kiểm tra số serial, chức năng và chụp ảnh hiện trạng khi giao và trả.',
    'Giao nhận tại địa chỉ trong đơn, theo thời gian đã đặt. Không xác nhận QR trước khi nhận hoặc kiểm tra tài sản thực tế.',
    'Cọc được giữ theo số tiền chốt trong đơn; hoàn toàn bộ khi trả đúng hiện trạng. Không tự ý khấu trừ cọc.',
    'Mất mát, hư hỏng hoặc trả trễ phải có bằng chứng. Bồi thường chỉ được quyết định qua thỏa thuận hoặc xử lý tranh chấp, tối đa phần cọc đang giữ trong bản demo.',
    'Hủy trước khi nhận tài sản hoặc chủ từ chối: hoàn toàn bộ vào ví demo. Sau khi nhận: mở tranh chấp; tiền cọc bị giữ cho đến khi xử lý.',
    'ShareHub lưu tài khoản, thời gian và bản điều khoản chấp thuận cùng dữ liệu giao dịch. Ảnh giấy tờ chỉ cho chủ tài khoản và quản trị viên có quyền truy cập.',
    'Hai bên có quyền phản hồi và yêu cầu xem xét vi phạm; tố cáo chưa được xác nhận không tự làm giảm điểm uy tín. Điểm ShareHub không phải điểm tín dụng CIC.',
    'Thanh toán và giữ cọc hiện là mô phỏng học tập bằng ví ShareHub, không phải dịch vụ ký quỹ hay thanh toán ngân hàng thực.'
  ]
});
function acceptance(body, userId, now = new Date()) {
  if (body.acceptTerms !== true || body.termsVersion !== TERMS.version) {
    const e = new Error('Vui lòng đọc và đồng ý phiên bản điều khoản hiện tại.'); e.status = 400; throw e;
  }
  return { user: userId, acceptedAt: now, version: TERMS.version, snapshot: [...TERMS.sections] };
}
function validPeriod(start, end, now = Date.now()) {
  return Number.isFinite(+start) && Number.isFinite(+end) && +start >= new Date(now).setHours(0,0,0,0) && end > start && end - start <= 366 * 86400000;
}
function score(u, penalty = 0) {
  return Math.max(0, Math.min(100, Math.round((u.ratingCount ? u.ratingAvg / 5 * 40 : 20) + (u.kycStatus === 'verified' ? 30 : 0) + Math.min(u.completedCount || 0, 10) * 3 - penalty)));
}
module.exports = { TERMS, acceptance, validPeriod, score };

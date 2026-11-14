import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, AuthService, ToastService, money } from '../core/services';
import { fmtDate } from '../shared/ui';

@Component({
  standalone: true, imports: [FormsModule, RouterLink],
  styles: [`@media(max-width:650px){.checkout-layout{grid-template-columns:1fr!important}}`],
  template: `
  <div class="container page checkout-page" style="max-width:900px">
    <div class="checkout-heading"><span aria-hidden="true">↗</span><h1>Xác nhận thuê & tiền cọc</h1></div><div class="checkout-progress" aria-label="Tiến trình đặt thuê"><span><i>✓</i> Chọn thiết bị</span><b></b><span class="active"><i>2</i> Xác nhận & điều khoản</span><b></b><span><i>3</i> Chờ chủ duyệt</span></div>
    @if (loading()) { <div class="spinner"></div> }
    @else if (!d()) { <div class="card empty">Bạn chưa có yêu cầu thuê đang chờ. <a routerLink="/search" style="color:var(--g)" class="bold">Khám phá thiết bị →</a></div> }
    @else {
    <div class="card row between mb" [style.background]="left() < 120 ? '#fdf1dc' : 'var(--g-soft)'">
      <span>⏳ Bản nháp còn hiệu lực trong <b>{{ mm() }}:{{ ss() }}</b> để hoàn tất yêu cầu.</span><span class="badge">Ví mô phỏng</span></div>
    <div class="grid g2 checkout-layout" style="grid-template-columns:1.2fr 1fr">
      <div class="col">
        <div class="card"><h3>Thông tin đặt thuê</h3>
          <div class="row">@if (d().asset.images?.length) { <img [src]="d().asset.images[0]" [alt]="d().asset.title" style="width:70px;height:70px;object-fit:cover;border-radius:8px;flex:none"> } @else { <div class="ph" style="width:70px;height:70px;border-radius:8px;flex:none">▣</div> }
            <div><b>{{ d().asset.title }}</b><div class="small mut">{{ fmt(d().startDate) }} → {{ fmt(d().endDate) }} ({{ d().days }} ngày)</div>
              <div class="small mut">📍 Giao nhận: {{ d().asset.location?.address }}</div></div></div></div>
        <div class="card"><h3>Phương thức thanh toán</h3>
          @for (m of methods; track m.id) { <label class="row" style="font-weight:500;padding:8px 0;cursor:pointer"><input type="radio" name="pm" [value]="m.id" [(ngModel)]="method"> {{ m.icon }} {{ m.label }}
            @if (m.id === 'wallet') { <span class="mut small">(số dư {{ money(auth.user()?.walletBalance || 0) }})</span> }</label> }
          <div class="small mut">Thanh toán được mô phỏng phục vụ đồ án; không thu tiền thật.</div></div>
        @if (terms(); as t) { <section class="card terms-panel"><h3>1. Xác nhận điều khoản thuê</h3><p class="small mut">Phiên bản {{ t.version }} · Đọc trước khi gửi yêu cầu.</p><ol class="small">@for (section of t.sections; track section) { <li style="margin-bottom:10px">{{ section }}</li> }</ol><label class="row"><input type="checkbox" [(ngModel)]="accepted"> Tôi đã đọc và đồng ý các điều khoản, trách nhiệm bảo quản, cọc, bồi thường và chính sách dữ liệu.</label></section> }
      </div>
      <div class="card bill-card" style="align-self:start"><h3>Chi tiết chi phí</h3>
        <div class="col small" style="gap:8px">
          <div class="row between"><span>Tiền thuê</span><b>{{ money(d().rentalFee) }}</b></div>
          <div class="row between"><span>Tiền cọc tạm giữ</span><b>{{ money(d().deposit) }}</b></div>
          @if (d().discount) { <div class="row between" style="color:var(--g)"><span>Mã ưu đãi</span><b>-{{ money(d().discount) }}</b></div> }
          <div class="row"><input [(ngModel)]="coupon" placeholder="Mã ưu đãi (SHAREHUB10)"><button class="btn ghost sm" (click)="applyCoupon()">Áp dụng</button></div>
          <hr style="border:0;border-top:1px solid var(--line);width:100%">
          <div class="row between bill-total" style="font-size:1.15rem"><b>Tổng cộng</b><b style="color:var(--g)">{{ money(d().total) }}</b></div>
          <div class="mut">Tiền cọc được hoàn sau khi kiểm tra hiện trạng và hoàn tất đơn.</div>
          <button class="btn block" [disabled]="busy() || !accepted || !terms() || left() === 0" (click)="pay()">Xác nhận thanh toán {{ money(d().total) }}</button>
          <button class="btn ghost block" (click)="cancel()">Hủy</button></div></div>
    </div> }
  </div>`,
})
export class CheckoutComponent implements OnInit, OnDestroy {
  private api = inject(ApiService); private router = inject(Router); private toast = inject(ToastService);
  auth = inject(AuthService); money = money; fmt = fmtDate;
  d = signal<any>(null); loading = signal(true); busy = signal(false); left = signal(0); coupon = ''; method = 'wallet'; private t: any;
  accepted = false; terms = signal<any>(null);
  methods = [{ id: 'wallet', icon: '👛', label: 'Ví ShareHub (mô phỏng)' }];
  mm() { return String(Math.floor(this.left() / 60)).padStart(2, '0'); } ss() { return String(this.left() % 60).padStart(2, '0'); }
  ngOnInit() { this.load(); this.api.get('/api/bookings/terms').subscribe(t => this.terms.set(t)); }
  ngOnDestroy() { clearInterval(this.t); }
  load() {
    this.api.get<any>('/api/bookings/draft').subscribe({ next: d => { this.d.set(d); this.loading.set(false); if (d) this.countdown(d.expiresAt); }, error: () => this.loading.set(false) });
  }
  countdown(exp: number) {
    clearInterval(this.t);
    this.t = setInterval(() => { const s = Math.max(0, Math.round((exp - Date.now()) / 1000)); this.left.set(s); if (!s) { clearInterval(this.t); this.d.set(null); this.toast.show('Bản nháp đã hết hạn. Vui lòng chọn lại lịch thuê.', true); } }, 1000);
    this.left.set(Math.max(0, Math.round((exp - Date.now()) / 1000)));
  }
  applyCoupon() {
    const d = this.d();
    this.api.post('/api/bookings/draft', { assetId: d.assetId, startDate: d.startDate, endDate: d.endDate, coupon: this.coupon }).subscribe(() => { this.load(); this.toast.show('Đã kiểm tra và áp dụng mã nếu hợp lệ.'); });
  }
  pay() {
    if (!this.accepted || !this.terms()) return;
    this.busy.set(true);
    this.api.post<any>('/api/bookings/checkout', { paymentMethod: this.method, acceptTerms: this.accepted, termsVersion: this.terms().version }).subscribe({
      next: b => { this.auth.refresh().subscribe(); this.toast.show('Đã ghi nhận thanh toán mô phỏng. Đang chờ chủ tài sản duyệt.'); this.router.navigate(['/bookings', b._id]); },
      error: () => this.busy.set(false) });
  }
  cancel() { this.api.del('/api/bookings/draft').subscribe(() => this.router.navigateByUrl('/search')); }
}

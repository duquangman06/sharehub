import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, AuthService, ToastService, money } from '../core/services';
import { fmtDate } from '../shared/ui';

@Component({
  standalone: true, imports: [FormsModule, RouterLink],
  styles: [`@media(max-width:650px){.checkout-layout{grid-template-columns:1fr!important}}`],
  template: `
  <div class="container page" style="max-width:900px">
    <h1>Checkout & Escrow</h1>
    @if (loading()) { <div class="spinner"></div> }
    @else if (!d()) { <div class="card empty">No pending rental. <a routerLink="/search" style="color:var(--g)" class="bold">Browse equipment →</a></div> }
    @else {
    <div class="card row between mb" [style.background]="left() < 120 ? '#fdf1dc' : 'var(--g-soft)'">
      <span>⏳ Your draft expires in <b>{{ mm() }}:{{ ss() }}</b> to complete payment.</span><span class="badge">Demo wallet</span></div>
    <div class="grid g2 checkout-layout" style="grid-template-columns:1.2fr 1fr">
      <div class="col">
        <div class="card"><h3>Order summary</h3>
          <div class="row"><div class="ph" style="width:70px;height:70px;border-radius:12px;font-size:1.6rem">📦</div>
            <div><b>{{ d().asset.title }}</b><div class="small mut">{{ fmt(d().startDate) }} → {{ fmt(d().endDate) }} ({{ d().days }} days)</div>
              <div class="small mut">📍 Handover: {{ d().asset.location?.address }}</div></div></div></div>
        <div class="card"><h3>Payment method</h3>
          @for (m of methods; track m.id) { <label class="row" style="font-weight:500;padding:8px 0;cursor:pointer"><input type="radio" name="pm" [value]="m.id" [(ngModel)]="method"> {{ m.icon }} {{ m.label }}
            @if (m.id === 'wallet') { <span class="mut small">(balance {{ money(auth.user()?.walletBalance || 0) }})</span> }</label> }
          <div class="small mut">Payments are simulated in this academic project.</div></div>
        @if (terms(); as t) { <section class="card"><h3>1. Xác nhận điều khoản thuê</h3><p class="small mut">Phiên bản {{ t.version }} · Đọc trước khi gửi yêu cầu.</p><ol class="small">@for (section of t.sections; track section) { <li style="margin-bottom:10px">{{ section }}</li> }</ol><label class="row"><input type="checkbox" [(ngModel)]="accepted"> Tôi đã đọc và đồng ý các điều khoản, trách nhiệm bảo quản, cọc, bồi thường và chính sách dữ liệu.</label></section> }
      </div>
      <div class="card" style="align-self:start"><h3>Price details</h3>
        <div class="col small" style="gap:8px">
          <div class="row between"><span>Rental fee</span><b>{{ money(d().rentalFee) }}</b></div>
          <div class="row between"><span>Security deposit (held)</span><b>{{ money(d().deposit) }}</b></div>
          @if (d().discount) { <div class="row between" style="color:var(--g)"><span>Coupon</span><b>-{{ money(d().discount) }}</b></div> }
          <div class="row"><input [(ngModel)]="coupon" placeholder="Coupon (SHAREHUB10)"><button class="btn ghost sm" (click)="applyCoupon()">Apply</button></div>
          <hr style="border:0;border-top:1px solid var(--line);width:100%">
          <div class="row between" style="font-size:1.15rem"><b>Total</b><b style="color:var(--g)">{{ money(d().total) }}</b></div>
          <div class="mut">The deposit is returned after the item is checked in good condition.</div>
          <button class="btn block" [disabled]="busy() || !accepted || !terms() || left() === 0" (click)="pay()">Pay {{ money(d().total) }}</button>
          <button class="btn ghost block" (click)="cancel()">Cancel</button></div></div>
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
    this.t = setInterval(() => { const s = Math.max(0, Math.round((exp - Date.now()) / 1000)); this.left.set(s); if (!s) { clearInterval(this.t); this.d.set(null); this.toast.show('Hold expired.', true); } }, 1000);
    this.left.set(Math.max(0, Math.round((exp - Date.now()) / 1000)));
  }
  applyCoupon() {
    const d = this.d();
    this.api.post('/api/bookings/draft', { assetId: d.assetId, startDate: d.startDate, endDate: d.endDate, coupon: this.coupon }).subscribe(() => { this.load(); this.toast.show('Coupon applied if valid.'); });
  }
  pay() {
    if (!this.accepted || !this.terms()) return;
    this.busy.set(true);
    this.api.post<any>('/api/bookings/checkout', { paymentMethod: this.method, acceptTerms: this.accepted, termsVersion: this.terms().version }).subscribe({
      next: b => { this.auth.refresh().subscribe(); this.toast.show('Payment authorised. Waiting for owner approval.'); this.router.navigate(['/bookings', b._id]); },
      error: () => this.busy.set(false) });
  }
  cancel() { this.api.del('/api/bookings/draft').subscribe(() => this.router.navigateByUrl('/search')); }
}

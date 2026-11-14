import { VietnamesePipe } from '../shared/vietnamese';
import { Component, inject, Input, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService, AuthService, CatalogService, ToastService, money } from '../core/services';
import { Asset } from '../core/models';
import { StarsComponent, fmtDate, iso } from '../shared/ui';

@Component({
  standalone: true, imports: [VietnamesePipe, RouterLink, StarsComponent],
  styles: [`.lay{display:grid;grid-template-columns:1fr 380px;gap:22px;align-items:start}.main{height:480px;border-radius:18px;background-size:cover;background-position:center;transition:background-image .2s}
    .th{display:flex;gap:10px;margin-top:10px;overflow:auto}.th div{width:100px;height:72px;flex:none;border-radius:12px;background-size:cover;background-position:center;cursor:pointer;opacity:.72;transition:opacity .2s,transform .2s}.th div:hover{opacity:1;transform:translateY(-2px)}.th div.on{opacity:1;outline:2px solid var(--g)}
    .cal{user-select:none}.cal .h{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    .days{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center}.days b{font-size:.7rem;color:var(--mut)}
    .d{padding:8px 0;border-radius:8px;font-size:.85rem;cursor:pointer;border:0;background:#fff;font-family:inherit}.d:hover:not([disabled]){background:var(--g-soft)}
    .d[disabled]{color:#c3cdc8;background:repeating-linear-gradient(45deg,#f3f5f4,#f3f5f4 4px,#e8ecea 4px,#e8ecea 8px);cursor:not-allowed;text-decoration:line-through}
    .d.in{background:var(--g-soft)}.d.sel{background:var(--g)!important;color:#fff}
    .spec{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.bar{height:8px;background:#e4ece8;border-radius:4px;overflow:hidden}.bar i{display:block;height:100%;background:var(--g)}.review{padding:14px 0;border-top:1px solid var(--line)}.review p{margin:.45rem 0 0}
    @media(max-width:950px){.lay{grid-template-columns:1fr}.lay>div:last-child{position:static!important;top:auto!important}}@media(max-width:600px){.main{height:300px}.th div{width:78px;height:58px}}`],
  template: `
  @if (!asset()) { <div class="spinner"></div> } @else { <div class="container page"><div class="lay">
    <div class="col" style="gap:18px">
      <div class="card" style="padding:14px">
        @if (asset()!.images.length) {
          <div class="main" [style.background-image]="'url(' + asset()!.images[img()] + ')'"></div>
          <div class="th">@for (im of asset()!.images; track im; let i = $index) { <div [class.on]="i === img()" [style.background-image]="'url(' + im + ')'" (click)="img.set(i)"></div> }</div>
        } @else { <div class="main ph" style="font-size:7rem">{{ cat.icon(asset()!.category) }}</div> }
      </div>
      <div class="card">
        <span class="badge">{{ cat.name(asset()!.category) }}</span>
        <h1 style="margin-top:8px">{{ asset()!.title }}</h1>
        <app-stars [value]="asset()!.ratingAvg" [count]="asset()!.ratingCount" />
        <p>{{ asset()!.description }}</p>
        <div class="spec">
          <div><div class="small mut">Tình trạng thiết bị</div><div class="bar"><i [style.width.%]="asset()!.condition"></i></div><b>{{ asset()!.condition }}%</b></div>
          <div><div class="small mut">Giao nhận</div><b>{{ asset()!.delivery | vi }}</b></div>
          <div><div class="small mut">Thời gian kiểm tra giữa các lượt thuê</div><b>{{ asset()!.bufferHours }} giờ</b></div>
          <div><div class="small mut">Địa điểm</div><b>{{ asset()!.location?.address }}</b></div>
        </div>
        <h3 class="mt">Phụ kiện đi kèm</h3>
        <div class="row wrap">@for (a of asset()!.accessories; track a) { <span class="badge gray">🔌 {{ a }}</span> } @empty { <span class="mut small">Không có</span> }</div>
      </div>
      <div class="card">
        <h2>Đánh giá</h2>
        @for (review of reviews(); track review._id) {
          <article class="review"><div class="row between"><b>{{ review.from?.name || 'Thành viên ShareHub' }}</b><app-stars [value]="review.rating" /></div><p>{{ review.comment }}</p></article>
        } @empty { <div class="empty">Thiết bị này chưa có đánh giá.</div> }
      </div>
      <div class="card row between">
        <div class="row"><div class="ph" style="width:56px;height:56px;border-radius:50%;font-size:1.4rem">👤</div>
          <div><a [routerLink]="['/users', asset()!.owner._id]" class="bold"><b>{{ asset()!.owner.name }}</b></a>
            @if (asset()!.owner.kycStatus === 'verified') { <span class="badge">✔ Đã xác minh</span> }
            <div class="small mut"><app-stars [value]="asset()!.owner.ratingAvg" /> · Uy tín {{ asset()!.owner.trustScore }}/100 · phản hồi khoảng {{ asset()!.owner.avgResponseMinutes }} phút</div></div></div>
        <button class="btn ghost" (click)="chat()">💬 Nhắn tin</button>
      </div>
    </div>

    <div class="card rental-price-card" style="position:sticky;top:104px">
      <div class="row between"><div><span class="bold" style="font-size:1.5rem;color:var(--g)">{{ money(asset()!.pricePerDay) }}</span><span class="mut"> /ngày</span></div>
        @if (asset()!.pricePerHour) { <span class="small mut">{{ money(asset()!.pricePerHour) }}/giờ</span> }</div>
      <div class="cal mt">
        <div class="h"><button class="btn ghost sm" (click)="shift(-1)">‹</button><b>{{ monthLabel() }}</b><button class="btn ghost sm" (click)="shift(1)">›</button></div>
        <div class="days">@for (w of wd; track w) { <b>{{ w }}</b> }
          @for (b of blanks(); track $index) { <span></span> }
          @for (d of cells(); track d.iso) { <button class="d" [disabled]="d.off" [class.sel]="d.iso === start() || d.iso === end()" [class.in]="d.between" (click)="pick(d.iso)">{{ d.n }}</button> }</div>
        <div class="small mut" style="margin-top:6px">Ngày gạch chéo đã có lịch thuê hoặc đang bảo trì.</div>
      </div>
      <div class="mt small col" style="gap:6px">
        <div class="row between"><span>Thời gian thuê</span><b>{{ start() ? fmt(start()) : '—' }} → {{ end() ? fmt(end()) : '—' }}</b></div>
        <div class="row between"><span>{{ days() }} ngày × {{ money(asset()!.pricePerDay) }}</span><b>{{ money(fee()) }}</b></div>
        <div class="row between"><span>Tiền cọc (có thể hoàn lại)</span><b>{{ money(asset()!.deposit) }}</b></div>
        <hr style="width:100%;border:0;border-top:1px solid var(--line)">
        <div class="row between bill-total" style="font-size:1.1rem"><b>Tổng cộng</b><b style="color:var(--g)">{{ money(total()) }}</b></div>
      </div>
      @if (asset()!.bookingEligibility?.allowed === false) { <p class="small mt" role="status">{{asset()!.bookingEligibility?.message}} <a routerLink="/search" class="bold">Chọn thiết bị khác →</a></p> }
      <button class="btn block mt" [disabled]="!end() || busy() || asset()!.bookingEligibility?.allowed === false" (click)="book()">Đặt thuê ngay</button>
      <button class="btn ghost block" style="margin-top:8px" [disabled]="!end() || busy() || asset()!.bookingEligibility?.allowed === false" (click)="book()">Gửi yêu cầu thuê</button>
    </div>
  </div></div> }`,
})
export class AssetDetailComponent implements OnInit {
  @Input() id = '';   // withComponentInputBinding: nhận :id từ route
  private api = inject(ApiService); private router = inject(Router); private auth = inject(AuthService); private toast = inject(ToastService);
  cat = inject(CatalogService); money = money; fmt = fmtDate; wd = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  asset = signal<Asset | null>(null); img = signal(0); busy = signal(false);
  reviews = signal<any[]>([]);
  blocked = signal<{ from: string; to: string }[]>([]);
  month = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  start = signal(''); end = signal('');
  monthLabel = computed(() => this.month().toLocaleString('vi-VN', { month: 'long', year: 'numeric' }));
  blanks = computed(() => Array.from({ length: (this.month().getDay() + 6) % 7 }));
  cells = computed(() => {
    const m = this.month(), n = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate(), today = iso(new Date());
    return Array.from({ length: n }, (_, i) => {
      const d = iso(new Date(m.getFullYear(), m.getMonth(), i + 1));
      const busy = this.blocked().some(r => d >= r.from.slice(0, 10) && d < r.to.slice(0, 10));
      return { n: i + 1, iso: d, off: d < today || busy, between: !!this.start() && !!this.end() && d > this.start() && d < this.end() };
    });
  });
  days = computed(() => this.start() && this.end() ? Math.max(1, Math.round((+new Date(this.end()) - +new Date(this.start())) / 86400000)) : 0);
  // Tổng tiền = (Số ngày × Giá/ngày) + Tiền đặt cọc
  fee = computed(() => this.days() * (this.asset()?.pricePerDay || 0));
  total = computed(() => this.days() ? this.fee() + (this.asset()?.deposit || 0) : 0);
  ngOnInit() {
    this.api.get<Asset>('/api/assets/' + this.id).subscribe({ next: a => this.asset.set(a), error: () => this.router.navigateByUrl('/404') });
    this.api.get<any[]>(`/api/assets/${this.id}/availability`).subscribe(r => this.blocked.set(r.map(x => ({ from: x.from, to: x.to }))));
    this.api.get<any[]>(`/api/assets/${this.id}/reviews`).subscribe(r => this.reviews.set(r));
  }
  shift(n: number) { const m = this.month(); this.month.set(new Date(m.getFullYear(), m.getMonth() + n, 1)); }
  pick(d: string) {
    if (!this.start() || this.end() || d <= this.start()) { this.start.set(d); this.end.set(''); return; }
    // không cho khoảng chọn đè lên ngày đã kín
    if (this.blocked().some(r => r.from.slice(0, 10) < d && r.to.slice(0, 10) > this.start())) { this.toast.show('Khoảng đã chọn có ngày không còn trống.', true); this.start.set(d); return; }
    this.end.set(d);
  }
  book() {
    this.busy.set(true);
    // Lưu đơn nháp vào SESSION phía server (khách chưa đăng nhập vẫn lưu được)
    this.api.post('/api/bookings/draft', { assetId: this.id, startDate: this.start(), endDate: this.end() }).subscribe({
      next: () => this.router.navigateByUrl('/checkout'), error: () => this.busy.set(false) });
  }
  chat() { this.auth.user() ? this.router.navigate(['/messages', this.asset()!.owner._id], { queryParams: { asset: this.id } }) : this.router.navigate(['/auth'], { queryParams: { returnUrl: this.router.url } }); }
}

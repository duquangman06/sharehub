import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../core/services';
import { Asset } from '../core/models';
import { AssetCardComponent, iso } from '../shared/ui';

@Component({
  standalone: true, imports: [FormsModule, RouterLink, AssetCardComponent],
  styles: [`.hero{position:relative;isolation:isolate;overflow:visible;padding:72px 24px 30px;text-align:center;border-radius:0 0 30px 30px;background:linear-gradient(90deg,rgba(8,33,25,.77),rgba(8,33,25,.22)),url('/brand/sharehub-hero-v2.png') center 42%/cover;color:#fff;min-height:340px}.hero:before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(7,41,31,.25),transparent);border-radius:inherit}.hero h1{font-size:clamp(2.2rem,4vw,3.25rem);line-height:1.1;max-width:760px;margin:14px auto 10px;text-wrap:balance}.hero p{color:rgba(255,255,255,.86)}
    .bar{display:grid;grid-template-columns:2fr 1fr 1fr 1.4fr auto;gap:10px;background:#fff;padding:14px;border:1px solid rgba(255,255,255,.8);border-radius:999px;box-shadow:0 18px 44px rgba(0,0,0,.2);margin:26px auto 0;max-width:1040px;text-align:left;color:var(--ink)}.bar>div{padding:2px 8px}.bar input{border:0;padding:4px 0;background:transparent}.bar input:focus{outline:0}.bar .btn{border-radius:999px;min-width:112px}
    .cats{display:grid;grid-template-columns:repeat(8,1fr);gap:12px}.cat{text-align:center;padding:8px;cursor:pointer;overflow:hidden;transition:transform .2s var(--ease),box-shadow .2s}.cat:hover{transform:translateY(-3px);box-shadow:var(--sh-hover)}.cat-cover{height:82px;border-radius:12px;background-size:cover;background-position:center;margin-bottom:9px}.cat-icon{font-size:1.35rem;display:inline-block;margin-right:4px;vertical-align:middle}
    .cta{background:radial-gradient(circle at 88% 18%,rgba(201,243,107,.34),transparent 22%),linear-gradient(120deg,#075b48,#0b8a63 62%,#20b49a);color:#fff;border-radius:24px;padding:34px;display:flex;justify-content:space-between;align-items:center;gap:20px;box-shadow:0 18px 40px rgba(11,138,99,.16)}.products.g4{grid-template-columns:repeat(4,minmax(0,1fr))}
    @media(max-width:1024px){.products.g4{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:900px){.bar{grid-template-columns:1fr 1fr;border-radius:20px}.bar>div:first-child{grid-column:1/-1}.bar .btn{grid-column:1/-1;width:100%}.cats{grid-template-columns:repeat(4,1fr)}.products.g4{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.hero{padding:48px 10px 24px;min-height:390px}.bar{grid-template-columns:1fr;border-radius:18px;margin-top:20px}.bar>div:first-child{grid-column:auto}.bar .btn{grid-column:auto}.cat-cover{height:62px}.cats{gap:8px}}@media(max-width:440px){.products.g4{grid-template-columns:1fr}}`],
  template: `
  <div class="container">
    <section class="hero">
      <span class="badge">♻ Sharing economy platform</span>
      <h1>Chia sẻ nhiều hơn.<br>Thuê trọn niềm tin.</h1>
      <p class="mut">Tìm thiết bị phù hợp · Điều khoản minh bạch · Giao nhận có bằng chứng</p>
      <div class="bar">
        <div><label>What do you need?</label><input [(ngModel)]="q" placeholder="Camera, drone, speaker…" (keyup.enter)="go()"></div>
        <div><label>From</label><input type="date" [(ngModel)]="from" [min]="today"></div>
        <div><label>To</label><input type="date" [(ngModel)]="to" [min]="from || today"></div>
        <div><label>Area</label><div class="row"><input [(ngModel)]="areaLabel" placeholder="Use my location" readonly><button class="btn ghost sm" type="button" (click)="locate()">📍</button></div></div>
        <button class="btn" style="align-self:end" (click)="go()">Search</button>
      </div>
    </section>

    <section class="grid g3 mt" aria-label="Quy trình thuê an toàn"><div class="card"><span class="badge">01 · Chọn & xác nhận</span><h3>Biết rõ trước khi thuê</h3><p class="small mut">Xem hồ sơ, lịch trống, giá và cọc. Đọc điều khoản trước khi gửi yêu cầu.</p></div><div class="card"><span class="badge">02 · Duyệt & bàn giao</span><h3>Kiểm tra cùng nhau</h3><p class="small mut">Chủ duyệt yêu cầu. Xác nhận mã QR, chụp ảnh và lập biên bản tài sản, phụ kiện.</p></div><div class="card"><span class="badge">03 · Trả & hoàn cọc</span><h3>Khép lại minh bạch</h3><p class="small mut">Đối chiếu hiện trạng khi trả. Hoàn cọc hoặc gửi bằng chứng xử lý tranh chấp.</p></div></section>
    <section class="mt"><h2>Popular categories</h2>
      <div class="cats">@for (c of cat.categories(); track c._id) {
          <a class="card cat" [routerLink]="['/search']" [queryParams]="{ category: c.slug }"><div class="cat-cover" [style.background-image]="'url(/images/categories/' + c.slug + '.jpg)'"></div><span class="cat-icon">{{ c.icon }}</span><small class="bold">{{ c.name }}</small></a>
      }</div></section>

    <section class="mt" style="margin-top:34px">
      <div class="row between"><div><h2>Equipment worth sharing</h2><div class="small mut">Explore a curated selection from local owners</div></div><a routerLink="/search" class="btn ghost sm">See all →</a></div>
      @if (loading()) { <div class="grid g4">@for (s of [1,2,3,4]; track s) { <div class="card" style="padding:0;overflow:hidden"><div class="skeleton" style="height:210px;border-radius:0"></div><div style="padding:14px"><div class="skeleton" style="height:15px;width:75%;margin-bottom:12px"></div><div class="skeleton" style="height:12px;width:50%"></div></div></div> }</div> }
      @else {
        <div class="grid g4 products">@for (a of nearby(); track a._id) { <app-asset-card [asset]="a" /> }
        @empty { <div class="empty">No equipment yet.</div> }</div>
      }
    </section>

    <section class="cta" style="margin-top:36px">
      <div><h2 style="color:#fff;margin:0">Got idle equipment? Post it for rent now.</h2><p style="margin:6px 0 0;opacity:.9">List in 2 minutes. Deposit protection, QR handover and mutual reviews included.</p></div>
      <a routerLink="/lender/assets/new" class="btn ghost">Post your asset</a>
    </section>
  </div>`,
})
export class HomeComponent implements OnInit {
  cat = inject(CatalogService); private router = inject(Router);
  q = ''; from = ''; to = ''; areaLabel = ''; today = iso(new Date());
  coords: { lat: number; lng: number } | null = null;
  nearby = signal<Asset[]>([]); loading = signal(true);
  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true);
    // Mặc định: trung tâm Biên Hòa – khi cho phép vị trí sẽ dùng vị trí thật
    const p = this.coords || { lat: 10.9574, lng: 106.8426 };
    this.cat.search({ lat: p.lat, lng: p.lng, sort: 'distance' }).subscribe({ next: a => { this.nearby.set(a.slice(0, 30)); this.loading.set(false); }, error: () => this.loading.set(false) });
  }
  locate() {
    navigator.geolocation?.getCurrentPosition(pos => {
      this.coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }; this.areaLabel = 'Current location'; this.load();
    }, () => { this.areaLabel = 'Location blocked'; });
  }
  go() {
    this.router.navigate(['/search'], { queryParams: { q: this.q || null, from: this.from || null, to: this.to || null,
      lat: this.coords?.lat ?? null, lng: this.coords?.lng ?? null, radius: this.coords ? 10 : null } });
  }
}

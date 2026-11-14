import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { CatalogService, money } from '../core/services';
import { Asset } from '../core/models';
import { AssetCardComponent, PaginationComponent } from '../shared/ui';

@Component({
  standalone: true, imports: [FormsModule, AssetCardComponent, PaginationComponent],
  styles: [`.lay{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;align-items:start}.lay>div:first-child{min-width:0}
    .map-frame{height:calc(100vh - 110px);min-height:380px;min-width:0;position:sticky;top:84px;z-index:0;border-radius:18px;box-shadow:var(--sh);overflow:hidden;isolation:isolate}#map{height:100%;width:100%;background:#e7efeb;z-index:0}
    .map-note{position:absolute;z-index:500;left:12px;right:12px;bottom:12px;padding:10px 14px;border-radius:12px;background:#fff;color:var(--mut);box-shadow:var(--sh);font-size:.82rem}
    .list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.list>div{min-width:0}.pin{background:var(--g);color:#fff;font:700 12px Inter;padding:4px 8px;border-radius:99px;white-space:nowrap;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)}
    .pin.on{background:var(--ink);transform:scale(1.15)}@media(max-width:1120px){.lay{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}.list{grid-template-columns:1fr}}@media(max-width:900px){.lay{grid-template-columns:1fr}.map-frame{position:relative;top:auto;height:340px;min-height:0}.list{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.list{grid-template-columns:1fr}}`],
  template: `
  <div class="container page">
   <div class="asset-results-heading"><span class="eyebrow">TÌM ĐÚNG ĐỒ CHO KẾ HOẠCH CỦA BẠN</span><h1>Khám phá thiết bị.</h1><p>So sánh giá, khoảng cách và lịch thuê ngay tại đây.</p></div><div class="lay">
    <div>
      <div class="card mb">
        <div class="row between"><h3>Bộ lọc tìm kiếm</h3><button class="btn ghost sm" (click)="reset()">Đặt lại</button></div>
        <div class="grid g2" style="margin-top:8px">
          <div><label for="search-field-1">Từ khóa</label><input id="search-field-1" [(ngModel)]="f.q" (keyup.enter)="apply()" placeholder="Máy ảnh, máy bay mini…"></div>
          <div><label for="search-field-2">Danh mục</label><select id="search-field-2" [(ngModel)]="f.category" (change)="apply()"><option value="">Tất cả</option>@for (c of cat.categories(); track c._id) {<option [value]="c.slug">{{ c.name }}</option>}</select></div>
          <div><label for="search-field-3">Giá thuê mỗi ngày: tối đa {{ money(+f.max) }}</label><input id="search-field-3" type="range" min="50000" max="2000000" step="50000" [(ngModel)]="f.max" (change)="apply()"></div>
          <div><label for="search-field-4">Bán kính: {{ f.radius }} km</label><input id="search-field-4" type="range" min="1" max="10" [(ngModel)]="f.radius" (change)="apply()"></div>
          <div><label for="search-field-5">Đánh giá tối thiểu</label><select id="search-field-5" [(ngModel)]="f.rating" (change)="apply()"><option value="">Không giới hạn</option><option value="4">Từ 4★</option><option value="4.5">Từ 4,5★</option></select></div>
          <div><label for="search-field-6">Giao nhận</label><select id="search-field-6" [(ngModel)]="f.delivery" (change)="apply()"><option value="any">Không giới hạn</option><option value="pickup">Nhận trực tiếp</option><option value="delivery">Giao tận nơi</option></select></div>
          <div><label for="search-field-7">Sắp xếp</label><select id="search-field-7" [(ngModel)]="f.sort" (change)="apply()"><option value="distance">Gần nhất</option><option value="price_asc">Giá tăng dần</option><option value="price_desc">Giá giảm dần</option><option value="rating">Đánh giá</option></select></div>
          <div class="row" style="align-items:end"><button class="btn block" (click)="apply()">Áp dụng</button></div>
        </div>
      </div>
      <div class="row between mb"><b>{{ items().length }} kết quả</b><span class="small mut">Khu vực: {{ center.label }}</span></div>
      @if (loading()) { <div class="list">@for (s of [1,2,3,4]; track s) { <div class="card" style="padding:0;overflow:hidden"><div class="skeleton" style="height:190px;border-radius:0"></div><div style="padding:14px"><div class="skeleton" style="height:15px;width:76%;margin-bottom:12px"></div><div class="skeleton" style="height:12px;width:52%"></div></div></div> }</div> }
      @else {
        <div class="list">
          @for (a of paged(); track a._id) { <div [id]="'card-' + a._id"><app-asset-card [asset]="a" [highlight]="active() === a._id" (hover)="focus($event)" /></div> }
          @empty { <div class="empty" style="grid-column:1/-1">Chưa có thiết bị phù hợp. Bạn thử điều chỉnh bộ lọc nhé.</div> }
        </div>
        <app-pagination [total]="items().length" [size]="size" [(page)]="page" />
      }
    </div>
    <div class="map-frame"><div id="map" #mapEl></div>@if (mapError()) { <div class="map-note">Chưa tải được bản đồ. Vui lòng kiểm tra kết nối và tải lại trang.</div> }</div>
   </div>
  </div>`,
})
export class SearchComponent implements AfterViewInit, OnDestroy {
  cat = inject(CatalogService); private route = inject(ActivatedRoute); private router = inject(Router);
  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;
  money = money; size = 8; page = 1;
  items = signal<Asset[]>([]); loading = signal(true); active = signal('');
  center = { lat: 10.9574, lng: 106.8426, label: 'Biên Hòa (mặc định)' };
  f: any = { q: '', category: '', max: '2000000', radius: '10', rating: '', delivery: 'any', sort: 'distance', from: '', to: '' };
  private map?: L.Map; private layer = L.layerGroup(); private pins = new Map<string, L.Marker>();
  private resizeObserver?: ResizeObserver; mapError = signal(false);
  private sub = this.route.queryParamMap.subscribe(p => {
    // Đọc Query Parameters từ URL – có thể chia sẻ link tìm kiếm
    ['q', 'category', 'max', 'radius', 'rating', 'delivery', 'sort', 'from', 'to'].forEach(k => p.get(k) && (this.f[k] = p.get(k)));
    if (p.get('lat')) this.center = { lat: +p.get('lat')!, lng: +p.get('lng')!, label: 'Vị trí của bạn' };
    this.page = 1; this.fetch();
  });
  paged() { return this.items().slice((this.page - 1) * this.size, this.page * this.size); }
  constructor() { effect(() => { this.items(); this.active(); this.drawPins(); }); }
  ngAfterViewInit() {
    this.map = L.map(this.mapEl.nativeElement, { scrollWheelZoom: false }).setView([this.center.lat, this.center.lng], 11);
    // OSM standard tiles avoid the CARTO endpoint that was returning tile/API errors.
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    let loadedTiles = false;
    let fallbackUsed = false;
    tiles.on('tileerror', () => {
      if (loadedTiles || fallbackUsed || !this.map) return;
      fallbackUsed = true;
      this.map.removeLayer(tiles);
      const fallback = L.tileLayer('https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO', maxZoom: 19
      });
      fallback.on('tileload', () => { loadedTiles = true; this.mapError.set(false); });
      fallback.on('tileerror', () => { if (!loadedTiles) this.mapError.set(true); });
      fallback.addTo(this.map);
    });
    tiles.on('tileload', () => { loadedTiles = true; this.mapError.set(false); });
    tiles.addTo(this.map);
    this.layer.addTo(this.map); this.drawPins();
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize({ pan: false }));
    this.resizeObserver.observe(this.mapEl.nativeElement);
    requestAnimationFrame(() => this.map?.invalidateSize({ pan: false }));
    setTimeout(() => this.map?.invalidateSize({ pan: false }), 200);
  }
  ngOnDestroy() { this.sub.unsubscribe(); this.resizeObserver?.disconnect(); this.map?.remove(); }
  fetch() {
    this.loading.set(true);
    const { max, ...rest } = this.f;
    this.cat.search({ ...rest, max, lat: this.center.lat, lng: this.center.lng }).subscribe({
      next: a => { this.items.set(a); this.loading.set(false); }, error: () => this.loading.set(false) });
  }
  apply() { this.router.navigate([], { queryParams: { ...this.f, lat: this.center.lat, lng: this.center.lng }, queryParamsHandling: 'merge' }); }
  reset() { this.router.navigate(['/search']); this.f = { q: '', category: '', max: '2000000', radius: '10', rating: '', delivery: 'any', sort: 'distance', from: '', to: '' }; }
  focus(id: string) { this.active.set(id); }
  drawPins() {
    if (!this.map) return;
    this.layer.clearLayers(); this.pins.clear();
    const pts: L.LatLngExpression[] = [];
    this.items().forEach(a => {
      if (!a.location?.lat) return;
      const m = L.marker([a.location.lat, a.location.lng], { icon: L.divIcon({ className: '', html: `<div class="pin ${this.active() === a._id ? 'on' : ''}">${Math.round(a.pricePerDay / 1000)}k</div>`, iconSize: [48, 24], iconAnchor: [24, 12] }) });
      // Click ghim → cuộn tới & làm nổi thẻ tương ứng
      m.on('click', () => {
        this.active.set(a._id);
        const idx = this.items().findIndex(x => x._id === a._id); this.page = Math.floor(idx / this.size) + 1;
        setTimeout(() => document.getElementById('card-' + a._id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      });
      m.bindTooltip(a.title); m.addTo(this.layer); pts.push([a.location.lat, a.location.lng]);
    });
    if (pts.length && !this.active()) this.map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 13 });
  }
}

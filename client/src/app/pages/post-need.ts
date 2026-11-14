import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, CatalogService, money } from '../core/services';
import { iso } from '../shared/ui';

@Component({
  standalone: true, imports: [FormsModule, RouterLink],
  styles: [`.lay{display:grid;grid-template-columns:420px 1fr;gap:22px;align-items:start}
    .radar{position:relative;width:260px;height:260px;margin:10px auto;border-radius:50%;background:radial-gradient(circle,#edf1f3 0,#d1dfe8 60%,#a3bdcd);border:2px solid #769aaf;overflow:hidden}
    .radar::before{content:'';position:absolute;inset:0;background:conic-gradient(from 0deg,rgba(49,94,130,.45),transparent 25%);animation:spin 2.2s linear infinite;border-radius:50%}
    .radar.stop::before{animation:none;background:none}
    .radar i{position:absolute;width:10px;height:10px;background:var(--g);border-radius:50%;box-shadow:0 0 0 6px rgba(217,118,89,.2)}
    .ring{position:absolute;border:1px solid rgba(49,94,130,.3);border-radius:50%;inset:25%}.ring.b{inset:10%}
    .match{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}@media(max-width:1000px){.lay{grid-template-columns:1fr}.match{grid-template-columns:1fr}}`],
  template: `
  <div class="container page"><div class="lay">
    <div class="card"><h2>Bạn cần thuê gì?</h2>
      <div class="col">
        <div><label for="post-need-field-1">Tiêu đề</label><input id="post-need-field-1" [(ngModel)]="f.title" placeholder="Ví dụ: Thuê máy ảnh cho chuyến đi cuối tuần"></div>
        <div><label for="post-need-field-2">Danh mục</label><select id="post-need-field-2" [(ngModel)]="f.category"><option value="">Chọn danh mục…</option>@for (c of cat.categories(); track c._id) {<option [value]="c.slug">{{ c.icon }} {{ c.name }}</option>}</select></div>
        <div><label for="post-need-field-3">Ngân sách tối đa: {{ money(f.budget) }}/ngày</label><input id="post-need-field-3" type="range" min="50000" max="3000000" step="50000" [(ngModel)]="f.budget"></div>
        <div class="grid g2"><div><label for="post-need-field-4">Từ ngày</label><input id="post-need-field-4" type="date" [(ngModel)]="f.dateFrom" [min]="today"></div><div><label for="post-need-field-5">Đến ngày</label><input id="post-need-field-5" type="date" [(ngModel)]="f.dateTo" [min]="f.dateFrom || today"></div></div>
        <div><label>Bán kính tìm kiếm</label><div class="row">@for (r of [1,3,5,10,25]; track r) { <button class="chip" [class.on]="f.radius === r" (click)="f.radius = r">{{ r }}km</button> }</div></div>
        <div><label>Vị trí của tôi</label><div class="row"><input [value]="f.lat ? f.lat.toFixed(4) + ', ' + f.lng.toFixed(4) : ''" readonly placeholder="Dùng vị trí hiện tại"><button class="btn ghost sm" (click)="locate()">📍</button></div></div>
        <div><label for="post-need-field-6">Mô tả nhu cầu</label><textarea id="post-need-field-6" rows="2" [(ngModel)]="f.details" placeholder="Ống kính, phụ kiện, thời gian nhận…"></textarea></div>
        <button class="btn block" [disabled]="!f.category || searching()" (click)="find()">TÌM THIẾT BỊ PHÙ HỢP</button>
      </div></div>
    <div><h2>Kết nối với thiết bị quanh bạn</h2>
      <div class="radar" [class.stop]="!searching()"><div class="ring"></div><div class="ring b"></div><i style="top:30%;left:60%"></i><i style="top:62%;left:35%"></i><i style="top:45%;left:75%"></i><i style="top:70%;left:62%"></i></div>
      <div class="center bold">
        @if (searching()) { Đang tìm thiết bị còn trống trong bán kính {{ f.radius }} km… }
        @else if (matches() === null) { <span class="mut">Điền nhu cầu và chọn “Tìm thiết bị phù hợp”.</span> }
        @else { <span class="badge" style="font-size:.9rem">{{ matches()!.length }} gợi ý phù hợp trong khu vực</span> }</div>
      @if (matches(); as ms) {
        <div class="match mt">@for (m of ms; track m.asset._id) {
          <div class="card col" style="gap:8px"><div class="row"><div class="ph" style="width:34px;height:34px;border-radius:50%;font-size:1rem">👤</div><div><b class="small">{{ m.asset.owner.name }}</b><div class="small mut">{{ m.distance }} km từ bạn</div></div></div>
            <b>{{ m.asset.title }}</b><div class="small mut">Giá thuê: <b>{{ money(m.asset.pricePerDay) }}/ngày</b></div>
            <div class="small mut">Mức độ phù hợp</div><div style="font-size:1.4rem;font-weight:800;color:var(--g)">{{ m.score }}% phù hợp</div>
            <a class="btn sm" [routerLink]="['/assets', m.asset._id]">Xem thiết bị</a>
            <a class="btn ghost sm" [routerLink]="['/messages', m.asset.owner._id]" [queryParams]="{ asset: m.asset._id }">Nhắn cho chủ tài sản</a></div>
        } @empty { <div class="empty" style="grid-column:1/-1">Chưa có thiết bị phù hợp. Bạn thử tăng bán kính hoặc ngân sách nhé.</div> }</div> }
    </div>
  </div></div>`,
})
export class PostNeedComponent {
  private api = inject(ApiService); cat = inject(CatalogService); money = money; today = iso(new Date());
  f: any = { title: '', category: '', budget: 800000, dateFrom: '', dateTo: '', radius: 5, lat: 10.9574, lng: 106.8426, details: '' };
  searching = signal(false); matches = signal<any[] | null>(null);
  locate() { navigator.geolocation?.getCurrentPosition(p => { this.f.lat = p.coords.latitude; this.f.lng = p.coords.longitude; }); }
  find() {
    this.searching.set(true); this.matches.set(null);
    this.api.post<any>('/api/requests', this.f).subscribe({
      next: r => setTimeout(() => { this.matches.set(r.matches); this.searching.set(false); }, 1800), // hiệu ứng radar
      error: () => this.searching.set(false) });
  }
}

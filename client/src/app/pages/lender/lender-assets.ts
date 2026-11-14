import { VietnamesePipe } from '../../shared/vietnamese';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, CatalogService, money } from '../../core/services';
import { Asset } from '../../core/models';

@Component({
  standalone: true, imports: [VietnamesePipe, RouterLink],
  template: `@if (loading()) { <div class="spinner"></div> } @else {
  <div class="grid g3">@for (a of list(); track a._id) {
    <div class="card col owner-asset-card" style="gap:12px">@if (a.images.length) { <a [routerLink]="['/assets',a._id]" class="owner-asset-photo"><img [src]="a.images[0]" [alt]="a.title" loading="lazy"></a> }<div class="row between"><span class="badge gray">{{ cat.name(a.category) }}</span>
      <span class="badge" [class.warn]="a.status === 'pending'" [class.bad]="a.status === 'rejected'" [class.gray]="a.status === 'hidden'">{{ (a.status) | vi }}</span></div>
      <b>{{ a.title }}</b><div class="small mut">{{ money(a.pricePerDay) }}/ngày · tiền cọc {{ money(a.deposit) }}</div>
      <div class="row"><a class="btn ghost sm" [routerLink]="['/assets', a._id]">Xem</a><a class="btn ghost sm" [routerLink]="['/lender/assets', a._id, 'edit']">Sửa</a>
        <button class="btn ghost sm" (click)="del(a)">Gỡ</button></div></div>
  } @empty { <div class="card empty" style="grid-column:1/-1">Bạn chưa đăng thiết bị nào. <a routerLink="assets/new" class="bold" style="color:var(--g)">Đăng thiết bị đầu tiên →</a></div> }</div>}`,
})
export class LenderAssetsComponent implements OnInit {
  private api = inject(ApiService); cat = inject(CatalogService); money = money;
  list = signal<Asset[]>([]); loading = signal(true);
  ngOnInit() { this.api.get<Asset[]>('/api/assets/mine').subscribe({ next: l => { this.list.set(l); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  del(a: Asset) { if (confirm('Bạn muốn gỡ thiết bị này khỏi danh sách cho thuê?')) this.api.del('/api/assets/' + a._id).subscribe(() => this.list.update(l => l.filter(x => x._id !== a._id))); }
}

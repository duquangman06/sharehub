import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService, money } from '../core/services';
import { Asset } from '../core/models';

/** Rating Star – Component tái sử dụng (@Input) */
@Component({
  selector: 'app-stars', standalone: true,
  template: `<span style="color:#f2a900;letter-spacing:1px">{{ stars() }}</span> <span class="small mut">{{ value.toFixed(1) }}@if (count !== null) { ({{ count }}) }</span>`,
})
export class StarsComponent {
  @Input() value = 0; @Input() count: number | null = null;
  stars() { const r = Math.round(this.value); return '★'.repeat(r) + '☆'.repeat(5 - r); }
}

/** Product Card – @Input() nhận dữ liệu, @Output() phát sự kiện hover (Chương II) */
@Component({
  selector: 'app-asset-card', host: { class: 'asset-card' }, standalone: true, imports: [RouterLink, StarsComponent],
  styles: [`.c{padding:0;overflow:hidden;transition:transform .24s cubic-bezier(.2,.75,.25,1),box-shadow .24s;cursor:pointer;display:block}.c:hover,.c.hl{transform:translateY(-4px);box-shadow:var(--sh-hover)}
    .c.hl{outline:2px solid var(--g)}.visual{height:218px;position:relative;background:#e6f6ef}.img{height:100%;background-size:cover;background-position:center;transition:transform .45s cubic-bezier(.2,.75,.25,1)}.c:hover .img{transform:scale(1.035)}.b{padding:15px}.heart{position:absolute;right:12px;top:12px;width:38px;height:38px;border:0;border-radius:50%;background:rgba(255,255,255,.94);color:var(--ink);font-size:1.15rem;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,.15);transition:transform .2s,color .2s}.heart:hover{transform:scale(1.1)}.heart.on{color:#df4961}.asset-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}.verified{position:absolute;left:12px;top:12px;background:rgba(255,255,255,.94)}`],
  template: `
  <a class="card c" [class.hl]="highlight" [routerLink]="['/assets', asset._id]" (mouseenter)="hover.emit(asset._id)">
    <div class="visual">
    @if (asset.images.length) { <div class="img" [style.background-image]="'url(' + asset.images[0] + ')'"></div> }
    @else { <div class="img ph">{{ cat.icon(asset.category) }}</div> }
    <button class="heart" [class.on]="favorite" type="button" [attr.aria-label]="favorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'" (click)="toggleFavorite($event)">{{ favorite ? '♥' : '♡' }}</button>
    @if (asset.owner?.kycStatus === 'verified') { <span class="badge verified">✔ Chủ đã xác minh</span> }
    </div>
    <div class="b">
      <div class="row between"><h3 class="asset-title" style="margin:0;font-size:1rem">{{ asset.title }}</h3></div>
      <div class="row small mut" style="margin:4px 0"><app-stars [value]="asset.ratingAvg" [count]="asset.ratingCount" />
        </div>
      <div class="row between"><span class="bold" style="color:var(--g)">{{ money(asset.pricePerDay) }}<span class="mut small">/ngày</span></span>
        @if (asset.distance != null) { <span class="small mut">📍 {{ asset.distance }} km</span> }</div>
      <div class="small mut">Tiền cọc: {{ money(asset.deposit) }}</div>
    </div>
  </a>`,
})
export class AssetCardComponent {
  @Input({ required: true }) asset!: Asset;
  @Input() highlight = false;
  @Output() hover = new EventEmitter<string>();
  favorite = false;
  cat = inject(CatalogService); money = money;
  toggleFavorite(event: MouseEvent) { event.preventDefault(); event.stopPropagation(); this.favorite = !this.favorite; }
}

/** Pagination – Component tái sử dụng */
@Component({
  selector: 'app-pagination', standalone: true,
  template: `@if (pages() > 1) {<div class="row" style="justify-content:center;margin-top:18px">
    <button class="btn ghost sm" [disabled]="page <= 1" (click)="go(page - 1)">‹</button>
    @for (p of arr(); track p) { <button class="btn sm" [class.ghost]="p !== page" (click)="go(p)">{{ p }}</button> }
    <button class="btn ghost sm" [disabled]="page >= pages()" (click)="go(page + 1)">›</button></div>}`,
})
export class PaginationComponent {
  @Input() total = 0; @Input() size = 9; @Input() page = 1; @Output() pageChange = new EventEmitter<number>();
  pages() { return Math.ceil(this.total / this.size); }
  arr() { return Array.from({ length: this.pages() }, (_, i) => i + 1); }
  go(p: number) { this.pageChange.emit(p); }
}

export const fmtDate = (d: any) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' });
export const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const STATUS_STEPS = ['Chờ duyệt', 'Đã duyệt', 'Đã nhận', 'Đã trả', 'Hoàn tất'];
export const statusIndex = (s: string) => ({ pending: 0, paid: 1, picked_up: 2, returned: 3, completed: 4, disputed: 3 } as any)[s] ?? 0;

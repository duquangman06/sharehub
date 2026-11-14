import { KycReviewComponent } from './kyc-review';
import { VietnamesePipe } from '../../shared/vietnamese';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, CatalogService, ToastService, money } from '../../core/services';

@Component({
  standalone: true, imports: [KycReviewComponent, VietnamesePipe, FormsModule],
  template: `<app-kyc-review/><div class="grid g2" style="align-items:start">
    <div class="col">
      <div class="card"><h3>Quản lý & kiểm duyệt tài sản</h3><select [(ngModel)]="assetStatus" (change)="load()">@for (s of ['pending','active','hidden','rejected']; track s) { <option [value]="s">{{ (s) | vi }}</option> }</select>@for (a of assets(); track a._id) {
        <div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line)"><div><b>{{ a.title }}</b><div class="small mut">{{ a.owner?.name }} · {{ money(a.pricePerDay) }}/ngày</div></div>
          <div class="row"><button class="btn sm" [disabled]="a.status !== 'pending'" (click)="assetAct(a, 'approve')">Duyệt</button><button class="btn danger sm" [disabled]="a.status !== 'pending'" (click)="assetAct(a, 'reject')">Từ chối</button><button class="btn ghost sm" (click)="hideAsset(a)">Ẩn / yêu cầu duyệt lại</button></div></div>
      } @empty { <div class="empty">Không có tin cần duyệt.</div> }</div>
    </div>
    <div class="card"><h3>Danh mục thiết bị</h3>
      <div class="row mb"><input [(ngModel)]="icon" style="width:70px" placeholder="📦"><input [(ngModel)]="name" placeholder="Tên danh mục mới"><button class="btn sm" [disabled]="!name" (click)="add()">Thêm</button></div>
      @for (c of cat.categories(); track c._id) { <div class="row between" style="padding:6px 0"><span>{{ c.icon }} {{ c.name }}</span><button class="btn ghost sm" (click)="rm(c._id)">Gỡ</button></div> }</div>
  </div>`,
})
export class AdminModerationComponent implements OnInit {
  private api = inject(ApiService); private toast = inject(ToastService); cat = inject(CatalogService); money = money;
  assetStatus = 'pending';
  hideAsset(a:any) { const note = window.prompt('Lý do ẩn / yêu cầu duyệt lại (ít nhất 10 ký tự)'); if (!note || note.trim().length < 10) return; this.api.post('/api/admin/listings/' + a._id + '/status', {status:a.status === 'hidden' ? 'pending' : 'hidden',note}).subscribe(() => this.load()); }
  assets = signal<any[]>([]); name = ''; icon = '📦';
  ngOnInit() { this.load(); }
  load() { this.api.get<any[]>('/api/admin/assets?status=' + this.assetStatus).subscribe(a => this.assets.set(a)); }
  assetAct(a: any, act: string) { this.api.post(`/api/admin/assets/${a._id}/${act}`).subscribe(() => { this.toast.show('Đã hoàn tất.'); this.load(); }); }
  add() { this.api.post('/api/admin/categories', { name: this.name, icon: this.icon }).subscribe(() => { this.name = ''; this.cat.loadCategories(); }); }
  rm(id: string) { this.api.del('/api/admin/categories/' + id).subscribe(() => this.cat.loadCategories()); }
}

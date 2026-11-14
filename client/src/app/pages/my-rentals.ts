import { VietnamesePipe } from '../shared/vietnamese';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, money } from '../core/services';
import { Booking } from '../core/models';
import { fmtDate } from '../shared/ui';

export const STATUS_BADGE: any = { pending: 'warn', paid: '', picked_up: '', returned: '', completed: 'gray', rejected: 'bad', cancelled: 'bad', disputed: 'bad' };
@Component({
  standalone: true, imports: [VietnamesePipe, RouterLink],
  template: `
  <div class="container page"><h1>Đơn thuê của tôi</h1>
    <div class="row mb"><button class="chip" [class.on]="role() === 'renter'" (click)="set('renter')">Tôi đi thuê</button>
      <button class="chip" [class.on]="role() === 'owner'" (click)="set('owner')">Tôi cho thuê</button></div>
    @if (loading()) { <div class="spinner"></div> }
    @else {
      <div class="col">@for (b of list(); track b._id) {
        <a class="card row between" [routerLink]="['/bookings', b._id]">
          <div><b>{{ b.asset?.title }}</b><div class="small mut">{{ fmt(b.startDate) }} → {{ fmt(b.endDate) }} · {{ b.days }} ngày · với {{ role() === 'renter' ? b.owner?.name : b.renter?.name }}</div></div>
          <div class="row"><b>{{ money(b.total) }}</b><span class="badge" [class]="'badge ' + badge[b.status]">{{ (b.status) | vi }}</span></div></a>
      } @empty { <div class="card empty">Bạn chưa có đơn thuê trong mục này. <a routerLink="/search" class="bold" style="color:var(--g)">Tìm thiết bị →</a></div> }</div>
    }
  </div>`,
})
export class MyRentalsComponent implements OnInit {
  private api = inject(ApiService); money = money; fmt = fmtDate; badge = STATUS_BADGE;
  role = signal<'renter' | 'owner'>('renter'); list = signal<Booking[]>([]); loading = signal(true);
  ngOnInit() { this.set('renter'); }
  set(r: 'renter' | 'owner') { this.role.set(r); this.loading.set(true); this.api.get<Booking[]>('/api/bookings', { role: r }).subscribe({ next: l => { this.list.set(l); this.loading.set(false); }, error: () => this.loading.set(false) }); }
}

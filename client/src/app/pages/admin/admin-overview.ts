import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../../core/services';
@Component({
  standalone: true,
  template: `@if (s(); as s) { <div class="grid g3">
    @for (c of cards(s); track c[0]) { <div class="card"><div class="mut small">{{ c[0] }}</div><b style="font-size:2rem;color:var(--g)">{{ c[1] }}</b></div> }</div> }`,
})
export class AdminOverviewComponent implements OnInit {
  private api = inject(ApiService); s = signal<any>(null);
  ngOnInit() { this.api.get('/api/admin/stats').subscribe(s => this.s.set(s)); }
  cards(s: any) { return [['Thành viên', s.users], ['Tin đang hoạt động', s.assets], ['Đơn thuê', s.bookings], ['Tin chờ duyệt', s.pendingAssets], ['Hồ sơ chờ xác minh', s.pendingKyc], ['Tranh chấp đang mở', s.openDisputes]]; }
}

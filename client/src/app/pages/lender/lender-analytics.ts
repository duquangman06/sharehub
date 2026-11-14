import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, ToastService, money } from '../../core/services';

@Component({
  standalone: true, imports: [FormsModule],
  styles: [`.stat b{font-size:1.7rem;color:var(--g)}.chart{display:flex;align-items:flex-end;gap:10px;height:190px;padding-top:10px}
    .col2{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}.col2 i{width:100%;background:linear-gradient(180deg,#16b98a,var(--g));border-radius:6px 6px 0 0;min-height:2px}
    .bar{height:10px;background:#e4ece8;border-radius:5px;overflow:hidden}.bar i{display:block;height:100%;background:var(--g)}`],
  template: `
  @if (!d()) { <div class="spinner"></div> } @else {
  <div class="grid g3 mb">
    <div class="card stat"><div class="mut small">Tiền thuê trong tháng</div><b>{{ money(d().monthRevenue) }}</b></div>
    <div class="card stat"><div class="mut small">Đơn thuê trong tháng</div><b>{{ d().monthBookings }}</b></div>
    <div class="card stat"><div class="mut small">Tỷ lệ khai thác</div><b>{{ d().utilization }}%</b><div class="bar"><i [style.width.%]="d().utilization"></i></div></div>
  </div>
  <div class="card mb"><div class="row between"><h3 style="margin:0">Tiền thuê thu được</h3><div class="row"><button class="chip" [class.on]="view() === 'weekly'" (click)="view.set('weekly')">Theo tuần</button><button class="chip" [class.on]="view() === 'monthly'" (click)="view.set('monthly')">Theo tháng</button></div></div>
    <div class="chart">@for (p of series(); track p.label) { <div class="col2"><small>{{ p.revenue ? short(p.revenue) : '' }}</small><i [style.height.%]="pct(p.revenue)"></i><small class="mut">{{ p.label }}</small></div> }</div></div>
  <div class="card"><h3>Tiến độ thu hồi vốn theo thiết bị</h3>
    @for (a of d().perAsset; track a._id) {
      <div style="padding:10px 0;border-bottom:1px solid var(--line)"><div class="row between wrap"><b>{{ a.title }}</b>
        <div class="row small"><span class="mut">Giá mua</span><input type="number" style="width:140px" [(ngModel)]="a.purchasePrice" (change)="savePrice(a)"></div></div>
        <div class="row small mut" style="margin:6px 0">Đã thu {{ money(a.revenue) }}</div><div class="bar"><i [style.width.%]="a.recovered"></i></div><div class="small bold">{{ a.recovered }}% vốn đã thu hồi</div></div>
    } @empty { <div class="empty">Đăng thiết bị để theo dõi tiến độ thu hồi vốn.</div> }</div> }`,
})
export class LenderAnalyticsComponent implements OnInit {
  private api = inject(ApiService); private toast = inject(ToastService); money = money;
  d = signal<any>(null); view = signal<'weekly' | 'monthly'>('weekly');
  ngOnInit() { this.api.get('/api/lender/analytics').subscribe(d => this.d.set(d)); }
  series() { return this.d()[this.view()]; }
  pct(v: number) { const max = Math.max(1, ...this.series().map((s: any) => s.revenue)); return v / max * 100; }
  short(v: number) { return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : Math.round(v / 1e3) + 'k'; }
  savePrice(a: any) { this.api.put(`/api/lender/assets/${a._id}/purchase-price`, { purchasePrice: a.purchasePrice }).subscribe(() => { this.toast.show('Đã cập nhật.'); this.ngOnInit(); }); }
}

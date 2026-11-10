import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, ToastService, money } from '../../core/services';
import { Booking } from '../../core/models';
import { fmtDate, iso } from '../../shared/ui';

@Component({
  standalone: true, imports: [RouterLink, FormsModule],
  styles: [`.days{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.days b{text-align:center;font-size:.72rem;color:var(--mut)}
    .d{min-height:62px;border-radius:8px;background:#f4f8f6;padding:4px;font-size:.72rem}.d .n{font-weight:700}.d.t{outline:2px solid var(--g)}
    .ev{display:block;background:var(--g);color:#fff;border-radius:4px;padding:1px 4px;margin-top:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.ev.m{background:var(--warn)}.ev.p{background:#8fb8a8}`],
  template: `
  <div class="grid g2" style="grid-template-columns:1.3fr 1fr;align-items:start">
    <div class="card"><div class="row between mb"><button class="btn ghost sm" (click)="shift(-1)">‹</button><h3 style="margin:0">{{ label() }}</h3><button class="btn ghost sm" (click)="shift(1)">›</button></div>
      <div class="days">@for (w of ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']; track w) { <b>{{ w }}</b> }
        @for (b of blanks(); track $index) { <span></span> }
        @for (d of cells(); track d.iso) { <div class="d" [class.t]="d.iso === today"><span class="n">{{ d.n }}</span>
          @for (e of d.ev; track $index) { <span class="ev" [class.m]="e.type === 'm'" [class.p]="e.type === 'p'">{{ e.label }}</span> }</div> }</div>
      <div class="row small mut mt"><span class="ev" style="padding:2px 8px">Rented</span><span class="ev p" style="padding:2px 8px">Awaiting approval</span><span class="ev m" style="padding:2px 8px">Maintenance</span></div>
      <h3 class="mt">Block days for maintenance</h3>
      <div class="row wrap"><select [(ngModel)]="blk.asset">@for (a of assets(); track a._id) {<option [value]="a._id">{{ a.title }}</option>}</select>
        <input type="date" [(ngModel)]="blk.from"><input type="date" [(ngModel)]="blk.to"><button class="btn sm" [disabled]="!blk.asset || !blk.from || !blk.to" (click)="block()">Block</button></div>
    </div>
    <div class="card"><h3>Requests to review</h3>
      @for (b of pending(); track b._id) {
        <div class="col" style="padding:12px 0;border-bottom:1px solid var(--line);gap:6px"><b>{{ b.asset?.title }}</b>
          <div class="small mut">{{ b.renter?.name }} (trust {{ b.renter?.trustScore }}) · {{ fmt(b.startDate) }} → {{ fmt(b.endDate) }} · {{ money(b.rentalFee) }}</div>
          <div class="row"><button class="btn sm" (click)="approve(b)">Accept</button><input [(ngModel)]="reasons[b._id]" placeholder="Reason to decline"><button class="btn danger sm" (click)="reject(b)">Decline</button></div></div>
      } @empty { <div class="empty">No pending requests 🎉</div> }
      <h3 class="mt">All orders</h3>
      @for (b of orders(); track b._id) { <a [routerLink]="['/bookings', b._id]" class="row between small" style="padding:8px 0"><span>{{ b.asset?.title }}</span><span class="badge">{{ b.status.replace('_',' ') }}</span></a> }
    </div>
  </div>`,
})
export class LenderOrdersComponent implements OnInit {
  private api = inject(ApiService); private toast = inject(ToastService); money = money; fmt = fmtDate; today = iso(new Date());
  orders = signal<Booking[]>([]); assets = signal<any[]>([]); month = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  reasons: any = {}; blk: any = { asset: '', from: '', to: '' };
  pending = computed(() => this.orders().filter(o => o.status === 'pending'));
  label = computed(() => this.month().toLocaleString('en', { month: 'long', year: 'numeric' }));
  blanks = computed(() => Array.from({ length: (this.month().getDay() + 6) % 7 }));
  cells = computed(() => {
    const m = this.month(), n = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    return Array.from({ length: n }, (_, i) => {
      const d = iso(new Date(m.getFullYear(), m.getMonth(), i + 1)); const ev: any[] = [];
      this.orders().filter(o => !['rejected', 'cancelled', 'completed'].includes(o.status) && d >= o.startDate.slice(0, 10) && d < o.endDate.slice(0, 10))
        .forEach(o => ev.push({ type: o.status === 'pending' ? 'p' : 'b', label: o.asset?.title }));
      this.assets().forEach(a => (a.blockedRanges || []).forEach((r: any) => d >= r.from.slice(0, 10) && d < r.to.slice(0, 10) && ev.push({ type: 'm', label: '🛠 ' + a.title })));
      return { n: i + 1, iso: d, ev };
    });
  });
  ngOnInit() { this.load(); }
  load() { this.api.get<Booking[]>('/api/bookings', { role: 'owner' }).subscribe(o => this.orders.set(o));
    this.api.get<any[]>('/api/assets/mine').subscribe(a => { this.assets.set(a); this.blk.asset ||= a[0]?._id; }); }
  shift(n: number) { const m = this.month(); this.month.set(new Date(m.getFullYear(), m.getMonth() + n, 1)); }
  approve(b: Booking) { this.api.post(`/api/bookings/${b._id}/approve`).subscribe(() => { this.toast.show('Accepted.'); this.load(); }); }
  reject(b: Booking) { this.api.post(`/api/bookings/${b._id}/reject`, { reason: this.reasons[b._id] }).subscribe(() => { this.toast.show('Declined & renter refunded.'); this.load(); }); }
  block() { this.api.post(`/api/assets/${this.blk.asset}/block`, { from: this.blk.from, to: this.blk.to, reason: 'Maintenance' }).subscribe(() => { this.toast.show('Days blocked.'); this.load(); }); }
}

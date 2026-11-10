import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, ToastService, money } from '../../core/services';

@Component({
  standalone: true, imports: [FormsModule],
  styles: [`.ph4{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}.ph4 img{width:100%;height:100px;object-fit:cover;border-radius:8px}`],
  template: `@for (b of list(); track b._id) {
    <div class="card mb"><div class="row between"><h3 style="margin:0">{{ b.asset?.title }}</h3><span class="badge bad">Open dispute</span></div>
      <div class="small mut">Renter {{ b.renter?.name }} · Owner {{ b.owner?.name }} · deposit {{ money(b.deposit) }} · opened by {{ b.dispute?.openedBy?.name }}: “{{ b.dispute?.reason }}”</div>
      <div class="grid g2 mt"><div><b class="small">Check-in photos</b><div class="ph4">@for (p of b.checkinPhotos; track p) { <img [src]="p"> } @empty { <span class="mut small">none</span> }</div></div>
        <div><b class="small">Check-out photos</b><div class="ph4">@for (p of b.checkoutPhotos; track p) { <img [src]="p"> } @empty { <span class="mut small">none</span> }</div></div></div>
      <section class="mt"><b>Phản hồi hai bên</b>@for (e of b.dispute?.responses; track $index) { <p class="small">{{ e.from === b.renter?._id ? b.renter?.name : b.owner?.name }}: {{ e.note }}</p><div class="ph4">@for (p of e.photos; track p) { <img [src]="p" alt="Bằng chứng"> }</div> }</section>
      <div class="mt"><label>Refund to renter: {{ pct[b._id] ?? 100 }}% of deposit ({{ money(b.deposit * (pct[b._id] ?? 100) / 100) }}) · owner compensation {{ money(b.deposit * (100 - (pct[b._id] ?? 100)) / 100) }}</label>
        <input type="range" min="0" max="100" step="10" [ngModel]="pct[b._id] ?? 100" (ngModelChange)="pct[b._id] = $event"></div>
      <div class="row mt"><input [(ngModel)]="notes[b._id]" placeholder="Decision note"><button class="btn" [disabled]="(notes[b._id] || '').trim().length < 10" (click)="resolve(b)">Resolve</button></div></div>
  } @empty { <div class="card empty">No open disputes.</div> }`,
})
export class AdminDisputesComponent implements OnInit {
  private api = inject(ApiService); private toast = inject(ToastService); money = money;
  list = signal<any[]>([]); pct: any = {}; notes: any = {};
  ngOnInit() { this.api.get<any[]>('/api/admin/disputes').subscribe(l => this.list.set(l)); }
  resolve(b: any) { this.api.post(`/api/admin/disputes/${b._id}/resolve`, { refundToRenterPercent: this.pct[b._id] ?? 100, note: this.notes[b._id] }).subscribe(() => { this.toast.show('Dispute resolved.'); this.ngOnInit(); }); }
}

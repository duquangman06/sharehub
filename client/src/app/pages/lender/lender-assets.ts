import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, CatalogService, money } from '../../core/services';
import { Asset } from '../../core/models';

@Component({
  standalone: true, imports: [RouterLink],
  template: `@if (loading()) { <div class="spinner"></div> } @else {
  <div class="grid g3">@for (a of list(); track a._id) {
    <div class="card col" style="gap:8px"><div class="row between"><span style="font-size:2rem">{{ cat.icon(a.category) }}</span>
      <span class="badge" [class.warn]="a.status === 'pending'" [class.bad]="a.status === 'rejected'" [class.gray]="a.status === 'hidden'">{{ a.status }}</span></div>
      <b>{{ a.title }}</b><div class="small mut">{{ money(a.pricePerDay) }}/day · deposit {{ money(a.deposit) }}</div>
      <div class="row"><a class="btn ghost sm" [routerLink]="['/assets', a._id]">View</a><a class="btn ghost sm" [routerLink]="['assets', a._id, 'edit']">Edit</a>
        <button class="btn ghost sm" (click)="del(a)">Delete</button></div></div>
  } @empty { <div class="card empty" style="grid-column:1/-1">You haven't listed anything yet. <a routerLink="assets/new" class="bold" style="color:var(--g)">Post your first asset →</a></div> }</div>}`,
})
export class LenderAssetsComponent implements OnInit {
  private api = inject(ApiService); cat = inject(CatalogService); money = money;
  list = signal<Asset[]>([]); loading = signal(true);
  ngOnInit() { this.api.get<Asset[]>('/api/assets/mine').subscribe({ next: l => { this.list.set(l); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  del(a: Asset) { if (confirm('Delete this asset?')) this.api.del('/api/assets/' + a._id).subscribe(() => this.list.update(l => l.filter(x => x._id !== a._id))); }
}

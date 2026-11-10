import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, CatalogService, money } from '../core/services';
import { iso } from '../shared/ui';

@Component({
  standalone: true, imports: [FormsModule, RouterLink],
  styles: [`.lay{display:grid;grid-template-columns:420px 1fr;gap:22px;align-items:start}
    .radar{position:relative;width:260px;height:260px;margin:10px auto;border-radius:50%;background:radial-gradient(circle,#d9f3e8 0,#a7dec6 60%,#7cc9a9);border:2px solid #5fb996;overflow:hidden}
    .radar::before{content:'';position:absolute;inset:0;background:conic-gradient(from 0deg,rgba(11,138,99,.55),transparent 25%);animation:spin 2.2s linear infinite;border-radius:50%}
    .radar.stop::before{animation:none;background:none}
    .radar i{position:absolute;width:10px;height:10px;background:var(--g);border-radius:50%;box-shadow:0 0 0 6px rgba(11,138,99,.2)}
    .ring{position:absolute;border:1px solid rgba(11,138,99,.35);border-radius:50%;inset:25%}.ring.b{inset:10%}
    .match{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}@media(max-width:1000px){.lay{grid-template-columns:1fr}.match{grid-template-columns:1fr}}`],
  template: `
  <div class="container page"><div class="lay">
    <div class="card"><h2>Post a Rental Need</h2>
      <div class="col">
        <div><label>Title</label><input [(ngModel)]="f.title" placeholder="Rent a cinema camera for indie film"></div>
        <div><label>Category</label><select [(ngModel)]="f.category"><option value="">Select…</option>@for (c of cat.categories(); track c._id) {<option [value]="c.slug">{{ c.icon }} {{ c.name }}</option>}</select></div>
        <div><label>Max budget: {{ money(f.budget) }}/day</label><input type="range" min="50000" max="3000000" step="50000" [(ngModel)]="f.budget"></div>
        <div class="grid g2"><div><label>From</label><input type="date" [(ngModel)]="f.dateFrom" [min]="today"></div><div><label>To</label><input type="date" [(ngModel)]="f.dateTo" [min]="f.dateFrom || today"></div></div>
        <div><label>Search radius</label><div class="row">@for (r of [1,3,5,10,25]; track r) { <button class="chip" [class.on]="f.radius === r" (click)="f.radius = r">{{ r }}km</button> }</div></div>
        <div><label>My location</label><div class="row"><input [value]="f.lat ? f.lat.toFixed(4) + ', ' + f.lng.toFixed(4) : ''" readonly placeholder="Detect my location"><button class="btn ghost sm" (click)="locate()">📍</button></div></div>
        <div><label>Details</label><textarea rows="2" [(ngModel)]="f.details" placeholder="Lens, accessories, pick-up time…"></textarea></div>
        <button class="btn block" [disabled]="!f.category || searching()" (click)="find()">FIND MATCHES</button>
      </div></div>
    <div><h2>Auto-Matching Engine</h2>
      <div class="radar" [class.stop]="!searching()"><div class="ring"></div><div class="ring b"></div><i style="top:30%;left:60%"></i><i style="top:62%;left:35%"></i><i style="top:45%;left:75%"></i><i style="top:70%;left:62%"></i></div>
      <div class="center bold">
        @if (searching()) { Searching for owners with free equipment within {{ f.radius }} km… }
        @else if (matches() === null) { <span class="mut">Fill in the form and press “Find matches”.</span> }
        @else { <span class="badge" style="font-size:.9rem">{{ matches()!.length }} owners matched in your area</span> }</div>
      @if (matches(); as ms) {
        <div class="match mt">@for (m of ms; track m.asset._id) {
          <div class="card col" style="gap:8px"><div class="row"><div class="ph" style="width:34px;height:34px;border-radius:50%;font-size:1rem">👤</div><div><b class="small">{{ m.asset.owner.name }}</b><div class="small mut">{{ m.distance }} km away</div></div></div>
            <b>{{ m.asset.title }}</b><div class="small mut">Rate: <b>{{ money(m.asset.pricePerDay) }}/day</b></div>
            <div class="small mut">Compatibility</div><div style="font-size:1.4rem;font-weight:800;color:var(--g)">{{ m.score }}% Match</div>
            <a class="btn sm" [routerLink]="['/assets', m.asset._id]">Instant Accept</a>
            <a class="btn ghost sm" [routerLink]="['/messages', m.asset.owner._id]" [queryParams]="{ asset: m.asset._id }">Message Owner</a></div>
        } @empty { <div class="empty" style="grid-column:1/-1">No owners available. Try a larger radius or budget.</div> }</div> }
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

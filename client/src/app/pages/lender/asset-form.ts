import { AfterViewInit, Component, ElementRef, inject, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import * as L from 'leaflet';
import { ApiService, CatalogService, ToastService } from '../../core/services';

@Component({
  standalone: true, imports: [ReactiveFormsModule],
  styles: [`#pick{height:260px;border-radius:12px;z-index:1}.thumb{width:80px;height:60px;object-fit:cover;border-radius:8px}`],
  template: `
  <form class="card" [formGroup]="form" (ngSubmit)="save()"><h2>{{ id ? 'Edit asset' : 'List a new asset' }}</h2>
    <div class="grid g2">
      <div class="col">
        <div><label>Title *</label><input formControlName="title" [class.is-invalid]="inv('title')"></div>
        <div><label>Category *</label><select formControlName="category" [class.is-invalid]="inv('category')"><option value="">Select…</option>@for (c of cat.categories(); track c._id) {<option [value]="c.slug">{{ c.icon }} {{ c.name }}</option>}</select></div>
        <div><label>Description</label><textarea rows="3" formControlName="description"></textarea></div>
        <div><label>Accessories (comma separated)</label><input formControlName="accessories" placeholder="Battery, charger, memory card"></div>
        <div><label>Condition (remaining life %)</label><input type="number" min="1" max="100" formControlName="condition"></div>
        <div><label>Photos (multiple)</label><input type="file" multiple accept="image/*" (change)="images = $any($event.target).files">
          <div class="row mt">@for (im of keep; track im) { <img class="thumb" [src]="im"> }</div></div>
        <div><label>Serial number photo</label><input type="file" accept="image/*" (change)="serial = $any($event.target).files[0]"></div>
      </div>
      <div class="col">
        <div class="grid g2">
          <div><label>Price / hour</label><input type="number" min="0" formControlName="pricePerHour"></div>
          <div><label>Price / day *</label><input type="number" min="1" formControlName="pricePerDay" [class.is-invalid]="inv('pricePerDay')"></div>
          <div><label>Security deposit</label><input type="number" min="0" formControlName="deposit"></div>
          <div><label>Purchase price (for ROI)</label><input type="number" min="0" formControlName="purchasePrice"></div>
          <div><label>Buffer time (hours)</label><input type="number" min="0" formControlName="bufferHours"></div>
          <div><label>Handover</label><select formControlName="delivery"><option value="pickup">Self pick-up</option><option value="delivery">Delivery</option><option value="both">Both</option></select></div>
        </div>
        <div class="small mut">Buffer time blocks the item for inspection/maintenance after each rental (e.g. 2 hours).</div>
        <div><label>Default handover address</label><input formControlName="address" placeholder="Type address and click the map to pin"></div>
        <div id="pick" #pick></div><div class="small mut">📍 {{ form.value.lat?.toFixed?.(5) }}, {{ form.value.lng?.toFixed?.(5) }} – click the map to move the pin.</div>
      </div>
    </div>
    <div class="row mt"><button class="btn" [disabled]="form.invalid || busy">{{ id ? 'Save changes' : 'Publish listing' }}</button></div>
    <div class="small mut mt">Verified (eKYC) owners publish instantly; others wait for admin moderation.</div>
  </form>`,
})
export class AssetFormComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() id = '';
  @ViewChild('pick') pick!: ElementRef<HTMLDivElement>;
  private fb = inject(FormBuilder); private api = inject(ApiService); private router = inject(Router); private toast = inject(ToastService); cat = inject(CatalogService);
  images: FileList | null = null; serial?: File; keep: string[] = []; busy = false; private map?: L.Map; private marker?: L.Marker; private resizeObserver?: ResizeObserver;
  form = this.fb.nonNullable.group({
    title: ['', Validators.required], category: ['', Validators.required], description: [''], accessories: [''], condition: [95],
    pricePerHour: [0], pricePerDay: [0, [Validators.required, Validators.min(1)]], deposit: [0], purchasePrice: [0], bufferHours: [2],
    delivery: ['both'], address: [''], lat: [10.9574], lng: [106.8426],
  });
  inv(k: string) { const c = this.form.get(k)!; return c.invalid && c.touched; }
  ngOnInit() {
    if (this.id) this.api.get<any>('/api/assets/' + this.id).subscribe(a => {
      this.keep = a.images || [];
      this.form.patchValue({ ...a, accessories: (a.accessories || []).join(', '), address: a.location?.address, lat: a.location?.lat, lng: a.location?.lng });
      if (a.location) { this.marker?.setLatLng([a.location.lat, a.location.lng]); this.map?.setView([a.location.lat, a.location.lng], 14); }
    });
  }
  ngAfterViewInit() {
    const { lat, lng } = this.form.value as any;
    this.map = L.map(this.pick.nativeElement).setView([lat, lng], 12);
    L.tileLayer('https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap contributors © CARTO' }).addTo(this.map);
    this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
    const set = (p: L.LatLng) => { this.marker!.setLatLng(p); this.form.patchValue({ lat: p.lat, lng: p.lng }); };
    this.map.on('click', e => set(e.latlng)); this.marker.on('dragend', () => set(this.marker!.getLatLng()));
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize({ pan: false }));
    this.resizeObserver.observe(this.pick.nativeElement);
    requestAnimationFrame(() => this.map?.invalidateSize({ pan: false }));
    setTimeout(() => this.map?.invalidateSize({ pan: false }), 200);
  }
  ngOnDestroy() { this.resizeObserver?.disconnect(); this.map?.remove(); }
  save() {
    this.busy = true;
    const fd = new FormData(); Object.entries(this.form.getRawValue()).forEach(([k, v]) => fd.append(k, String(v)));
    fd.append('keepImages', JSON.stringify(this.keep));
    Array.from(this.images || []).slice(0, 6).forEach(f => fd.append('images', f)); if (this.serial) fd.append('serialImage', this.serial);
    const req = this.id ? this.api.put<any>('/api/assets/' + this.id, fd) : this.api.post<any>('/api/assets', fd);
    req.subscribe({ next: a => { this.toast.show(a.status === 'pending' ? 'Submitted – waiting for admin approval.' : 'Saved!'); this.router.navigateByUrl('/lender/assets'); }, error: () => this.busy = false });
  }
}

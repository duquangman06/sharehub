import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../core/services';
import { computed } from '@angular/core';
import { RevealDirective } from '../shared/reveal';
import { Asset } from '../core/models';
import { AssetCardComponent, iso } from '../shared/ui';

@Component({
  standalone: true, imports: [FormsModule, RouterLink, AssetCardComponent, RevealDirective],
  templateUrl: './home.html', styleUrl: './home.css',
})
export class HomeComponent implements OnInit {
  cat = inject(CatalogService); private router = inject(Router);
  q = ''; from = ''; to = ''; areaLabel = ''; today = iso(new Date());
  coords: { lat: number; lng: number } | null = null;
  nearby = signal<Asset[]>([]); loading = signal(true);
  featuredStart = signal(0);
  featured = computed(() => { const a = this.nearby(); if (!a.length) return []; return Array.from({length:Math.min(4,a.length)},(_,i)=>a[(this.featuredStart()+i)%a.length]); });
  cycle(direction:number) { const n=this.nearby().length; if(n) this.featuredStart.update(i => (i+direction*4+n)%n); }
  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true);
    // Mặc định: trung tâm Biên Hòa – khi cho phép vị trí sẽ dùng vị trí thật
    const p = this.coords || { lat: 10.9574, lng: 106.8426 };
    this.cat.search({ lat: p.lat, lng: p.lng, sort: 'distance' }).subscribe({ next: a => { this.nearby.set(a.slice(0, 30)); this.loading.set(false); }, error: () => this.loading.set(false) });
  }
  locate() {
    navigator.geolocation?.getCurrentPosition(pos => {
      this.coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }; this.areaLabel = 'Vị trí hiện tại'; this.load();
    }, () => { this.areaLabel = 'Chưa được cấp vị trí'; });
  }
  go() {
    this.router.navigate(['/search'], { queryParams: { q: this.q || null, from: this.from || null, to: this.to || null,
      lat: this.coords?.lat ?? null, lng: this.coords?.lng ?? null, radius: this.coords ? 10 : null } });
  }
}

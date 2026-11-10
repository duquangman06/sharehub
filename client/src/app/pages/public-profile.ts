import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService, CatalogService, money } from '../core/services';
import { FormsModule } from '@angular/forms';
import { AuthService, ToastService } from '../core/services';
import { StarsComponent } from '../shared/ui';

@Component({
  standalone: true, imports: [RouterLink, StarsComponent, FormsModule],
  styles: [`.hero{display:flex;gap:18px;align-items:center}.avatar{width:92px;height:92px;border-radius:50%;background-size:cover;background-position:center;flex:none}.asset{height:150px;border-radius:10px;margin-bottom:12px;font-size:3rem}.review{padding:14px 0;border-top:1px solid var(--line)}.review p{margin:.45rem 0 0}.kpis{display:flex;gap:20px;flex-wrap:wrap}.kpis b{font-size:1.2rem;color:var(--g)}@media(max-width:600px){.hero{align-items:flex-start}.avatar{width:68px;height:68px}}`],
  template: `@if (loading()) { <div class="spinner"></div> } @else { @if (data(); as d) {
    <div class="container page"><div class="col">
      <section class="card hero">
        @if (d.user.avatar) { <div class="avatar" [style.background-image]="'url(' + d.user.avatar + ')'"></div> } @else { <div class="avatar ph">👤</div> }
        <div><div class="row wrap"><h1>{{ d.user.name }}</h1>@if (d.user.kycStatus === 'verified') { <span class="badge">✔ Verified</span> } @else if (d.user.kycStatus === 'pending') { <span class="badge warn">Verification pending</span> }</div>
          <p>{{ d.user.bio || 'ShareHub member' }}</p><div class="kpis"><span><app-stars [value]="d.user.ratingAvg" [count]="d.user.ratingCount" /></span><span><b>{{ d.user.trustScore }}</b> Trust score</span><span><b>{{ d.user.completedCount }}</b> completed rentals</span></div></div>
      </section>
      <section class="card"><h2>Lịch sử uy tín ShareHub</h2><p class="small mut">Điểm nội bộ, không phải điểm tín dụng. Chỉ công bố vi phạm được quản trị viên xác nhận; giấy tờ và chứng cứ riêng tư không hiển thị.</p>@for (e of d.trustEvents; track e._id) { <article class="review"><span class="badge bad">−{{ e.penalty }} điểm · {{ e.kind }}</span><p>{{ e.summary }}</p>@if (auth.user()?._id === d.user._id) { <input [(ngModel)]="appeal" placeholder="Lý do yêu cầu xem xét lại"><button class="btn ghost sm" [disabled]="appeal.trim().length < 10" (click)="sendAppeal(e._id)">Gửi phản hồi</button>@if (e.appealAt) { <span class="small mut">Đã nhận phản hồi</span> } }</article> } @empty { <p>Chưa ghi nhận vi phạm đã xác nhận.</p> }</section>
      <section class="card"><h2>Listed assets</h2><div class="grid g3 mt">
        @for (a of d.assets; track a._id) { <a class="card" style="box-shadow:none;border:1px solid var(--line)" [routerLink]="['/assets', a._id]"><div class="ph asset">{{ cat.icon(a.category) }}</div><h3>{{ a.title }}</h3><div class="small mut">{{ cat.name(a.category) }} · {{ a.location?.address }}</div><b>{{ money(a.pricePerDay) }}/day</b></a> }
      </div>@if (!d.assets.length) { <div class="empty">No active listings yet.</div> }</section>
      <section class="card"><h2>Member reviews</h2>
        @for (r of d.reviews; track r._id) { <article class="review"><div class="row between"><b>{{ r.from?.name || 'ShareHub member' }}</b><app-stars [value]="r.rating" /></div><p>{{ r.comment }}</p></article> }
        @if (!d.reviews.length) { <div class="empty">No reviews yet.</div> }
      </section>
    </div></div>
  } @else { <div class="container page"><div class="card empty">This member could not be found.</div></div> } }`,
})
export class PublicProfileComponent implements OnInit {
  auth = inject(AuthService); private toast = inject(ToastService); appeal = '';
  sendAppeal(id: string) { this.api.post('/api/users/me/trust-events/' + id + '/appeal', { appeal: this.appeal }).subscribe(() => { this.appeal = ''; this.toast.show('Đã gửi yêu cầu xem xét.'); }); }
  private route = inject(ActivatedRoute); private api = inject(ApiService);
  cat = inject(CatalogService); money = money;
  data = signal<any>(null); loading = signal(true);
  ngOnInit() {
    this.api.get<any>('/api/users/' + this.route.snapshot.paramMap.get('id')).subscribe({ next: d => { this.data.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }
}

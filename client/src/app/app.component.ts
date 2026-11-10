import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, CatalogService, ToastService } from './core/services';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  styles: [`
    header{background:rgba(255,255,255,.94);backdrop-filter:blur(16px);position:sticky;top:0;z-index:50;box-shadow:0 5px 24px rgba(18,43,32,.07);border-bottom:1px solid rgba(25,74,52,.07)}
    .nav{display:flex;align-items:center;gap:16px;height:72px}
    .logo{display:flex;align-items:center;gap:9px;font-weight:800;font-size:1.35rem;letter-spacing:-.04em;color:var(--ink);white-space:nowrap}
    .logo-mark{display:grid;place-items:center;width:40px;height:40px;border-radius:14px;background:linear-gradient(145deg,#075b48,#0b9b71 72%,#a0d55c);color:#fff;box-shadow:0 7px 15px rgba(11,138,99,.2)}.logo-mark svg{width:25px;height:25px}
    nav{display:flex;align-items:center;gap:5px;flex:1;min-width:0}nav a{font-weight:600;font-size:.88rem;white-space:nowrap;padding:9px 13px;border-radius:999px;color:#40544d;transition:color .18s,background .18s,transform .18s}nav a:hover{color:var(--g2);background:#edf6ef;transform:translateY(-1px)}
    .user-link{white-space:nowrap;padding:9px 12px;border-radius:999px;background:#f5f8f7}.user-link:hover{background:var(--g-soft)}
    nav a.active{color:var(--g2);background:var(--g-soft)}
    footer{margin-top:56px;padding:42px 0 22px;color:var(--mut);font-size:.9rem;border-top:1px solid var(--line);background:#fff}
    .foot{display:grid;grid-template-columns:2fr 1fr 1fr 1.4fr;gap:32px}.foot h3{color:var(--ink);margin-bottom:12px}.foot a{display:block;margin:8px 0;transition:color .15s}.foot a:hover{color:var(--g)}.foot-brand{font-size:1.2rem;color:var(--ink);font-weight:800}.copy{border-top:1px solid var(--line);margin-top:28px;padding-top:18px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}@media(max-width:700px){.foot{grid-template-columns:1fr 1fr;gap:22px}.foot>div:first-child{grid-column:1/-1}}
  `],
  template: `
  <header>
    <div class="container nav">
      <a routerLink="/" class="logo"><span class="logo-mark" aria-hidden="true"><img src="/brand/sharehub-mark-v2.svg" width="38" height="38" alt=""></span><span>Share<span style="color:var(--g)">Hub</span></span></a>
      <nav class="hide-m">
        <a routerLink="/post-need" routerLinkActive="active">Post Need</a>
        <a routerLink="/search" routerLinkActive="active">Browse</a>
        <a routerLink="/my-rentals" routerLinkActive="active">My Rentals</a>
        <a routerLink="/lender" routerLinkActive="active">Lender Portal</a>
        <a routerLink="/messages" routerLinkActive="active">Messages</a>
        @if (auth.user()?.role === 'admin') { <a routerLink="/admin" routerLinkActive="active">Admin</a> }
      </nav>
      <span class="hide-m" style="flex:1"></span>
      @if (auth.user(); as u) {
        <a routerLink="/profile" class="row bold small user-link">👤 {{ u.name }}</a>
        <button class="btn ghost sm" (click)="logout()">Sign out</button>
      } @else {
        <a routerLink="/auth" class="btn ghost sm">Sign in</a>
      }
      <a routerLink="/lender/assets/new" class="btn">Post Your Asset</a>
    </div>
  </header>
  <router-outlet />
  <footer><div class="container"><div class="foot">
    <div><a routerLink="/" class="foot-brand"><span class="badge">S</span> ShareHub</a><p>Share More. Spend Less. Find trusted equipment and local owners for every project.</p></div>
    <div><h3>Explore</h3><a routerLink="/search">Browse equipment</a><a routerLink="/post-need">Post a need</a><a routerLink="/about">About ShareHub</a></div>
    <div><h3>Your account</h3><a routerLink="/profile">My profile</a><a routerLink="/my-rentals">My rentals</a><a routerLink="/messages">Messages</a></div>
    <div><h3>For owners</h3><a routerLink="/lender/assets/new">List an asset</a><a routerLink="/lender">Lender Portal</a><p class="small">Local sharing, clear terms, reliable handovers.</p></div>
  </div><div class="copy"><span>© ShareHub · Advanced Enterprise Web Development</span><span>Built for sharing in Vietnam</span></div></div></footer>
  @if (toast.msg(); as t) { <div class="toast" [class.bad]="t.bad">{{ t.text }}</div> }
  `,
})
export class AppComponent implements OnInit {
  auth = inject(AuthService);
  toast = inject(ToastService);
  private cat = inject(CatalogService);
  private router = inject(Router);
  ngOnInit() { this.auth.load().subscribe(); this.cat.loadCategories(); }
  logout() { this.auth.logout().subscribe(() => this.router.navigateByUrl('/')); }
}

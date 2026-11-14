import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, CatalogService, ToastService } from './core/services';
import { RentalAssistantComponent } from './shared/rental-assistant';

@Component({
  selector: 'app-root', standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive, RentalAssistantComponent],
  template: `
  <a class="skip-link" href="#main-content">Đến nội dung chính</a>
  <header class="site-header"><div class="container site-nav">
    <a routerLink="/" class="brand" aria-label="ShareHub – Trang chủ"><img src="/brand/sharehub-mark-v2.svg" width="40" height="40" alt=""><span>Share<span>Hub</span><small>CÙNG CHIA SẺ. THÊM TRẢI NGHIỆM.</small></span></a>
    <nav class="desktop-nav" aria-label="Điều hướng chính"><a routerLink="/search" routerLinkActive="active">Khám phá</a><a routerLink="/post-need" routerLinkActive="active">Đăng nhu cầu</a><a routerLink="/my-rentals" routerLinkActive="active">Đơn thuê</a><a routerLink="/lender" routerLinkActive="active">Cho thuê</a><a routerLink="/messages" routerLinkActive="active">Tin nhắn</a>@if (auth.user()?.role === 'admin') { <a routerLink="/admin" routerLinkActive="active">Quản trị</a> }</nav>
    <div class="nav-actions">@if (auth.user(); as u) { <a routerLink="/profile" class="account-link" [attr.aria-label]="'Hồ sơ của ' + u.name"><span class="account-dot">{{ u.name.charAt(0) }}</span><span class="account-name">{{ u.name }}</span></a><button class="text-button signout" (click)="logout()">Đăng xuất</button> } @else { <a routerLink="/auth" class="text-button">Đăng nhập</a> }<a routerLink="/lender/assets/new" class="btn nav-cta">Đăng cho thuê <span aria-hidden="true">↗</span></a><button class="menu-toggle" (click)="menu.showModal()" aria-label="Mở trình đơn" aria-haspopup="dialog"><span></span><span></span></button></div>
  </div></header>
  <dialog #menu class="mobile-menu" aria-label="Điều hướng ShareHub" (click)="$event.target === menu && menu.close()"><div class="mobile-menu-inner"><div class="row between"><b>ShareHub</b><button class="icon-button" aria-label="Đóng trình đơn" (click)="menu.close()">✕</button></div><nav aria-label="Điều hướng trên điện thoại">@for (link of mobileLinks; track link.path) { <a [routerLink]="link.path" (click)="menu.close()">{{ link.label }} <span>↗</span></a> }@if (auth.user()?.role === 'admin') { <a routerLink="/admin" (click)="menu.close()">Quản trị <span>↗</span></a> }</nav>@if (auth.user()) { <button class="text-button" (click)="menu.close(); logout()">Đăng xuất tài khoản</button> }<p>Thuê vừa đủ. Trải nghiệm nhiều hơn.</p><a class="btn block" routerLink="/lender/assets/new" (click)="menu.close()">Đăng thiết bị cho thuê</a></div></dialog>
  <main id="main-content"><router-outlet /></main>
  <footer class="site-footer"><div class="container"><div class="footer-invitation"><div><span class="eyebrow">MỘT MÓN ĐỒ. NHIỀU KHẢ NĂNG.</span><h2>Điều hay tiếp theo,<br>bắt đầu từ <em>chia sẻ.</em></h2></div><a class="round-link" routerLink="/search" aria-label="Khám phá thiết bị">↗</a></div>
    <div class="footer-grid"><div class="footer-brand"><a class="brand" routerLink="/"><img src="/brand/sharehub-mark-v2.svg" width="40" height="40" alt=""><span>ShareHub</span></a><p>Kết nối thiết bị đang nhàn rỗi với những kế hoạch đang chờ. Thuê linh hoạt, rõ chi phí, cùng có trách nhiệm.</p></div><div><h3>Khám phá</h3><a routerLink="/search">Tìm thiết bị</a><a routerLink="/post-need">Đăng nhu cầu thuê</a><a routerLink="/about">Câu chuyện ShareHub</a></div><div><h3>Dành cho bạn</h3><a routerLink="/profile">Hồ sơ & xác minh</a><a routerLink="/my-rentals">Đơn thuê của tôi</a><a routerLink="/messages">Hộp thư</a></div><div><h3>Dành cho chủ tài sản</h3><a routerLink="/lender/assets/new">Đăng cho thuê</a><a routerLink="/lender/orders">Lịch & yêu cầu thuê</a><a routerLink="/lender/analytics">Thống kê cho thuê</a></div></div><div class="footer-bottom"><span>© {{ year }} ShareHub · Nền tảng chia sẻ thiết bị</span><span>Được xây dựng cho những kết nối tại Việt Nam <span class="footer-spark">✳</span></span></div>
  </div></footer>
  @if (toast.msg(); as t) { <div class="toast" role="status" aria-live="polite" [class.bad]="t.bad"><span aria-hidden="true">{{ t.bad ? '!' : '✓' }}</span>{{ t.text }}</div> }
  <app-rental-assistant />
  `,
})
export class AppComponent implements OnInit {
  auth = inject(AuthService); toast = inject(ToastService); private cat = inject(CatalogService); private router = inject(Router);
  year = new Date().getFullYear();
  mobileLinks = [{path:'/search',label:'Khám phá thiết bị'},{path:'/post-need',label:'Đăng nhu cầu'},{path:'/my-rentals',label:'Đơn thuê của tôi'},{path:'/lender',label:'Kênh cho thuê'},{path:'/messages',label:'Tin nhắn'},{path:'/profile',label:'Hồ sơ cá nhân'},{path:'/about',label:'Về ShareHub'}];
  ngOnInit() { this.auth.load().subscribe(); this.cat.loadCategories(); }
  logout() { this.auth.logout().subscribe(() => this.router.navigateByUrl('/')); }
}

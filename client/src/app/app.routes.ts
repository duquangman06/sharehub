import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards';

export const routes: Routes = [
  { path: '', title: 'ShareHub', loadComponent: () => import('./pages/home').then(m => m.HomeComponent) },
  { path: 'about', title: 'Về ShareHub', loadComponent: () => import('./pages/about').then(m => m.AboutComponent) },
  { path: 'auth', title: 'Đăng nhập', loadComponent: () => import('./pages/auth').then(m => m.AuthComponent) },
  // Query Parameters: /search?category=cameras&min=100000&max=900000&radius=5
  { path: 'search', title: 'Khám phá', loadComponent: () => import('./pages/search').then(m => m.SearchComponent) },
  // Dynamic route :id
  { path: 'assets/:id', loadComponent: () => import('./pages/asset-detail').then(m => m.AssetDetailComponent) },
  { path: 'checkout', canActivate: [authGuard], title: 'Xác nhận thuê', loadComponent: () => import('./pages/checkout').then(m => m.CheckoutComponent) },
  { path: 'profile', canActivate: [authGuard], title: 'Hồ sơ của tôi', loadComponent: () => import('./pages/profile').then(m => m.ProfileComponent) },
  { path: 'users/:id', title: 'Hồ sơ thành viên', loadComponent: () => import('./pages/public-profile').then(m => m.PublicProfileComponent) },
  { path: 'my-rentals', canActivate: [authGuard], title: 'Đơn thuê của tôi', loadComponent: () => import('./pages/my-rentals').then(m => m.MyRentalsComponent) },
  { path: 'bookings/:id', canActivate: [authGuard], title: 'Chi tiết đơn thuê', loadComponent: () => import('./pages/booking-detail').then(m => m.BookingDetailComponent) },
  { path: 'post-need', canActivate: [authGuard], title: 'Đăng nhu cầu', loadComponent: () => import('./pages/post-need').then(m => m.PostNeedComponent) },
  { path: 'messages', canActivate: [authGuard], title: 'Tin nhắn', loadComponent: () => import('./pages/messages').then(m => m.MessagesComponent) },
  { path: 'messages/:userId', canActivate: [authGuard], title: 'Tin nhắn', loadComponent: () => import('./pages/messages').then(m => m.MessagesComponent) },
  // Lender Portal – Nested Routes + Lazy Loading
  { path: 'lender', canActivate: [authGuard], loadComponent: () => import('./pages/lender/lender-shell').then(m => m.LenderShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'assets' },
      { path: 'assets', title: 'Thiết bị của tôi', loadComponent: () => import('./pages/lender/lender-assets').then(m => m.LenderAssetsComponent) },
      { path: 'assets/new', title: 'Đăng thiết bị', loadComponent: () => import('./pages/lender/asset-form').then(m => m.AssetFormComponent) },
      { path: 'assets/:id/edit', title: 'Chỉnh sửa thiết bị', loadComponent: () => import('./pages/lender/asset-form').then(m => m.AssetFormComponent) },
      { path: 'orders', title: 'Lịch thuê & yêu cầu', loadComponent: () => import('./pages/lender/lender-orders').then(m => m.LenderOrdersComponent) },
      { path: 'analytics', title: 'Thống kê', loadComponent: () => import('./pages/lender/lender-analytics').then(m => m.LenderAnalyticsComponent) },
    ] },
  // Admin – lazy-loaded + nested + guard
  { path: 'admin', canActivate: [authGuard, adminGuard], loadComponent: () => import('./pages/admin/admin-shell').then(m => m.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      { path: 'management', title: 'Quản lý ShareHub', loadComponent: () => import('./pages/admin/admin-management').then(m => m.AdminManagementComponent) },
      { path: 'overview', title: 'Quản trị', loadComponent: () => import('./pages/admin/admin-overview').then(m => m.AdminOverviewComponent) },
      { path: 'moderation', title: 'Kiểm duyệt', loadComponent: () => import('./pages/admin/admin-moderation').then(m => m.AdminModerationComponent) },
      { path: 'disputes', title: 'Xử lý tranh chấp', loadComponent: () => import('./pages/admin/admin-disputes').then(m => m.AdminDisputesComponent) },
    ] },
  // Wildcard → 404
  { path: '**', title: '404', loadComponent: () => import('./pages/not-found').then(m => m.NotFoundComponent) },
];

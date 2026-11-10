import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards';

export const routes: Routes = [
  { path: '', title: 'ShareHub', loadComponent: () => import('./pages/home').then(m => m.HomeComponent) },
  { path: 'about', title: 'About ShareHub', loadComponent: () => import('./pages/about').then(m => m.AboutComponent) },
  { path: 'auth', title: 'Sign in', loadComponent: () => import('./pages/auth').then(m => m.AuthComponent) },
  // Query Parameters: /search?category=cameras&min=100000&max=900000&radius=5
  { path: 'search', title: 'Browse', loadComponent: () => import('./pages/search').then(m => m.SearchComponent) },
  // Dynamic route :id
  { path: 'assets/:id', loadComponent: () => import('./pages/asset-detail').then(m => m.AssetDetailComponent) },
  { path: 'checkout', canActivate: [authGuard], title: 'Checkout', loadComponent: () => import('./pages/checkout').then(m => m.CheckoutComponent) },
  { path: 'profile', canActivate: [authGuard], title: 'My profile', loadComponent: () => import('./pages/profile').then(m => m.ProfileComponent) },
  { path: 'users/:id', title: 'Member profile', loadComponent: () => import('./pages/public-profile').then(m => m.PublicProfileComponent) },
  { path: 'my-rentals', canActivate: [authGuard], title: 'My rentals', loadComponent: () => import('./pages/my-rentals').then(m => m.MyRentalsComponent) },
  { path: 'bookings/:id', canActivate: [authGuard], title: 'Booking', loadComponent: () => import('./pages/booking-detail').then(m => m.BookingDetailComponent) },
  { path: 'post-need', canActivate: [authGuard], title: 'Post a need', loadComponent: () => import('./pages/post-need').then(m => m.PostNeedComponent) },
  { path: 'messages', canActivate: [authGuard], title: 'Messages', loadComponent: () => import('./pages/messages').then(m => m.MessagesComponent) },
  { path: 'messages/:userId', canActivate: [authGuard], title: 'Messages', loadComponent: () => import('./pages/messages').then(m => m.MessagesComponent) },
  // Lender Portal – Nested Routes + Lazy Loading
  { path: 'lender', canActivate: [authGuard], loadComponent: () => import('./pages/lender/lender-shell').then(m => m.LenderShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'assets' },
      { path: 'assets', title: 'My assets', loadComponent: () => import('./pages/lender/lender-assets').then(m => m.LenderAssetsComponent) },
      { path: 'assets/new', title: 'List an asset', loadComponent: () => import('./pages/lender/asset-form').then(m => m.AssetFormComponent) },
      { path: 'assets/:id/edit', title: 'Edit asset', loadComponent: () => import('./pages/lender/asset-form').then(m => m.AssetFormComponent) },
      { path: 'orders', title: 'Calendar & orders', loadComponent: () => import('./pages/lender/lender-orders').then(m => m.LenderOrdersComponent) },
      { path: 'analytics', title: 'Analytics', loadComponent: () => import('./pages/lender/lender-analytics').then(m => m.LenderAnalyticsComponent) },
    ] },
  // Admin – lazy-loaded + nested + guard
  { path: 'admin', canActivate: [authGuard, adminGuard], loadComponent: () => import('./pages/admin/admin-shell').then(m => m.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      { path: 'management', title: 'Quản lý ShareHub', loadComponent: () => import('./pages/admin/admin-management').then(m => m.AdminManagementComponent) },
      { path: 'overview', title: 'Admin', loadComponent: () => import('./pages/admin/admin-overview').then(m => m.AdminOverviewComponent) },
      { path: 'moderation', title: 'Moderation', loadComponent: () => import('./pages/admin/admin-moderation').then(m => m.AdminModerationComponent) },
      { path: 'disputes', title: 'Dispute room', loadComponent: () => import('./pages/admin/admin-disputes').then(m => m.AdminDisputesComponent) },
    ] },
  // Wildcard → 404
  { path: '**', title: '404', loadComponent: () => import('./pages/not-found').then(m => m.NotFoundComponent) },
];

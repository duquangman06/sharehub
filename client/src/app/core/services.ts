import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, retry, throwError, tap, of } from 'rxjs';
import { Asset, Category, User } from './models';

/** Toast – thông báo trạng thái bằng Signal (Chương II/III) */
@Injectable({ providedIn: 'root' })
export class ToastService {
  msg = signal<{ text: string; bad: boolean } | null>(null);
  show(text: string, bad = false) { this.msg.set({ text, bad }); setTimeout(() => this.msg.set(null), 3200); }
}

/** Singleton Service qua DI: providedIn root (Chương III) */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  user = signal<User | null>(null);
  ready = signal(false);
  rememberedEmail = '';
  load() {
    return this.http.get<{ user: User | null; rememberedEmail: string }>('/api/auth/me').pipe(
      tap(r => { this.user.set(r.user); this.rememberedEmail = r.rememberedEmail; this.ready.set(true); }),
      catchError(() => { this.ready.set(true); return of(null); }));
  }
  login(b: any) { return this.http.post<User>('/api/auth/login', b).pipe(tap(u => this.user.set(u))); }
  register(b: any) { return this.http.post<User>('/api/auth/register', b).pipe(tap(u => this.user.set(u))); }
  logout() { return this.http.post('/api/auth/logout', {}).pipe(tap(() => this.user.set(null))); }
  refresh() { return this.http.get<{ user: User | null }>('/api/auth/me').pipe(tap(r => this.user.set(r.user))); }
  updateProfile(fd: FormData) { return this.http.put<User>('/api/users/me', fd).pipe(tap(u => this.user.set(u))); }
  submitKyc(fd: FormData) { return this.http.post<User>('/api/users/me/kyc', fd).pipe(tap(u => this.user.set(u))); }
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  /** HttpClient + RxJS: retry + catchError tập trung (Chương III) */
  get<T>(url: string, params?: Record<string, any>) {
    let p = new HttpParams();
    Object.entries(params || {}).forEach(([k, v]) => v !== '' && v != null && (p = p.set(k, v)));
    return this.http.get<T>(url, { params: p }).pipe(retry(1), catchError(e => this.fail(e)));
  }
  post<T>(url: string, body: any = {}) { return this.http.post<T>(url, body).pipe(catchError(e => this.fail(e))); }
  put<T>(url: string, body: any = {}) { return this.http.put<T>(url, body).pipe(catchError(e => this.fail(e))); }
  del<T>(url: string) { return this.http.delete<T>(url).pipe(catchError(e => this.fail(e))); }
  private fail(e: any) {
    const text = e.status === 0 ? 'Cannot reach the server. Is the API running?' : (e.error?.message || 'Something went wrong');
    this.toast.show(text, true);
    return throwError(() => e);
  }
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private api = inject(ApiService);
  categories = signal<Category[]>([]);
  loadCategories() { this.api.get<Category[]>('/api/categories').subscribe(c => this.categories.set(c)); }
  icon(slug: string) { return this.categories().find(c => c.slug === slug)?.icon || '📦'; }
  name(slug: string) { return this.categories().find(c => c.slug === slug)?.name || slug; }
  search(params: any) { return this.api.get<Asset[]>('/api/assets', params); }
}

export const money = (n: number) => (n || 0).toLocaleString('vi-VN') + '₫';

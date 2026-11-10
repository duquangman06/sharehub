import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services';
import { firstValueFrom } from 'rxjs';

/** Functional Guard CanActivate (Chương IV) */
async function ensure(auth: AuthService) { if (!auth.ready()) await firstValueFrom(auth.load()); }
export const authGuard: CanActivateFn = async (_r, state) => {
  const auth = inject(AuthService), router = inject(Router); await ensure(auth);
  return auth.user() ? true : router.createUrlTree(['/auth'], { queryParams: { returnUrl: state.url } });
};
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService), router = inject(Router); await ensure(auth);
  return auth.user()?.role === 'admin' ? true : router.createUrlTree(['/']);
};

import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';
import { AuthStore } from '../state/auth.store';

export const authGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);
  if (!store.isAuthenticated()) return router.createUrlTree(['/login']);
  return store.validateSession().pipe(
    map(valid => valid ? true : router.createUrlTree(['/login']))
  );
};

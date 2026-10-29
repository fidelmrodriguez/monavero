import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { from, map } from 'rxjs';
import { AuthStore } from '../state/auth.store';

export const loginRedirectGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  return from(authStore.waitForTabSession()).pipe(
    map(() => authStore.isAuthenticated() ? router.createUrlTree(['/app/dashboard']) : true)
  );
};

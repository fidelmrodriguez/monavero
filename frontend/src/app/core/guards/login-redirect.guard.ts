import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { from, map, switchMap } from 'rxjs';
import { AuthStore } from '../state/auth.store';
import { ApiReadinessService } from '../services/api-readiness.service';

export const loginRedirectGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  const apiReadiness = inject(ApiReadinessService);

  return from(apiReadiness.waitUntilReady()).pipe(
    switchMap(() => from(authStore.waitForTabSession())),
    map(() => authStore.isAuthenticated() ? router.createUrlTree(['/app/dashboard']) : true)
  );
};

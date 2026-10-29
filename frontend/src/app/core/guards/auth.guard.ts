import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { from, map, of, switchMap } from 'rxjs';
import { AuthStore } from '../state/auth.store';
import { ApiReadinessService } from '../services/api-readiness.service';

export const authGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);
  const apiReadiness = inject(ApiReadinessService);
  // Uma aba recém-aberta pode receber a sessão de outra aba autenticada.
  return from(apiReadiness.waitUntilReady()).pipe(
    switchMap(() => from(store.waitForTabSession())),
    switchMap(() => store.isAuthenticated() ? store.validateSession() : of(false)),
    map(valid => valid ? true : router.createUrlTree(['/login']))
  );
};

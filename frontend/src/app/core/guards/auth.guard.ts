import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { from, map, of, switchMap } from 'rxjs';
import { AuthStore } from '../state/auth.store';

export const authGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);
  // Uma aba recém-aberta pode receber a sessão de outra aba autenticada.
  return from(store.waitForTabSession()).pipe(
    switchMap(() => store.isAuthenticated() ? store.validateSession() : of(false)),
    map(valid => valid ? true : router.createUrlTree(['/login']))
  );
};

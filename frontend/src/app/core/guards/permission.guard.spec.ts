import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { permissionGuard } from './permission.guard';
import { AuthStore } from '../state/auth.store';
import { NotificationStore } from '../state/notification.store';

class AuthStoreMock {
  role() {
    return 'cliente';
  }
}

describe('permissionGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        NotificationStore,
        { provide: AuthStore, useClass: AuthStoreMock }
      ]
    });
  });

  it('deve bloquear rota fora do perfil permitido', () => {
    const route = new ActivatedRouteSnapshot();
    route.data = { roles: ['admin'] };
    const state = {} as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => permissionGuard(route, state));
    const router = TestBed.inject(Router);

    expect(result).toEqual(router.createUrlTree(['/app/dashboard']));
  });
});

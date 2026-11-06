import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { permissionGuard } from './permission.guard';
import { AuthStore } from '../state/auth.store';
import { NotificationStore } from '../state/notification.store';

class AuthStoreMock {
  viewRole() { return 'admin'; }
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

  it('deve bloquear rota fora do perfil real permitido', () => {
    const route = new ActivatedRouteSnapshot();
    route.data = { roles: ['admin'] };
    const state = {} as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => permissionGuard(route, state));
    const router = TestBed.inject(Router);

    expect(result).toEqual(router.createUrlTree(['/app/dashboard']));
  });

  it('permite visualizar a área administrativa quando o perfil real é admin', () => {
    const store = TestBed.inject(AuthStore) as unknown as AuthStoreMock;
    spyOn(store, 'role').and.returnValue('admin');
    const route = new ActivatedRouteSnapshot();
    route.data = { roles: ['admin'] };
    const result = TestBed.runInInjectionContext(() => permissionGuard(route, {} as RouterStateSnapshot));
    expect(result).toBeTrue();
  });
});

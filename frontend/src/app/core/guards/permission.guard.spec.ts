import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { permissionGuard } from './permission.guard';
import { AuthStore } from '../state/auth.store';
import { NotificationStore } from '../state/notification.store';

class AuthStoreMock {
  isDemo() { return false; }
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
        provideHttpClient(),
        provideHttpClientTesting(),
        NotificationStore,
        { provide: AuthStore, useClass: AuthStoreMock }
      ]
    });
  });

  it('bloqueia inclusive uma conta pessoal com papel admin', () => {
    const store = TestBed.inject(AuthStore) as unknown as AuthStoreMock;
    spyOn(store, 'role').and.returnValue('admin');
    const route = new ActivatedRouteSnapshot();
    route.data = { demoOnly: true };
    const state = {} as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => permissionGuard(route, state));
    const router = TestBed.inject(Router);

    expect(result).toEqual(router.createUrlTree(['/app/dashboard']));
  });

  it('permite a área administrativa ao guest sem trocar seu perfil visual', () => {
    const store = TestBed.inject(AuthStore) as unknown as AuthStoreMock;
    spyOn(store, 'isDemo').and.returnValue(true);
    const route = new ActivatedRouteSnapshot();
    route.data = { demoOnly: true };
    const result = TestBed.runInInjectionContext(() => permissionGuard(route, {} as RouterStateSnapshot));
    expect(result).toBeTrue();
  });
});

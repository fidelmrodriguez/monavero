import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AuthStore } from './auth.store';
import { AuthApiService } from '../services/auth-api.service';
import { AuditStore } from './audit.store';
import { NotificationStore } from './notification.store';
import { AuthProfile, AuthResponse } from '../models/auth.models';

const STORAGE_KEY = 'monavero-auth-v2';
const profile: AuthProfile = {
  id: 'demo-id', name: 'Usuário de teste', email: 'demo@monavero.invalid', role: 'CLIENT', demo: true
};
const response: AuthResponse = {
  accessToken: 'token-demo-valido', expiresAt: '2099-01-01T00:00:00Z', user: profile
};

/** Simula duas abas sem compartilhar sessionStorage entre instâncias do AuthStore. */
class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  constructor(readonly name: string) {
    FakeBroadcastChannel.instances.push(this);
  }
  postMessage(data: unknown): void {
    for (const peer of FakeBroadcastChannel.instances) {
      if (peer !== this && peer.name === this.name) {
        peer.onmessage?.({ data } as MessageEvent);
      }
    }
  }
  close(): void {
    FakeBroadcastChannel.instances = FakeBroadcastChannel.instances.filter(channel => channel !== this);
  }
}

describe('AuthStore entre abas', () => {
  let originalChannel: typeof BroadcastChannel;
  let api: jasmine.SpyObj<AuthApiService>;
  let router: { url: string; navigateByUrl: jasmine.Spy };
  const stores: AuthStore[] = [];

  function newTab(): AuthStore {
    const store = TestBed.runInInjectionContext(() => new AuthStore());
    stores.push(store);
    return store;
  }

  beforeEach(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    FakeBroadcastChannel.instances = [];
    originalChannel = window.BroadcastChannel;
    Object.defineProperty(window, 'BroadcastChannel', {
      configurable: true, writable: true, value: FakeBroadcastChannel
    });
    api = jasmine.createSpyObj<AuthApiService>('AuthApiService', ['login', 'register', 'demo', 'me', 'logout']);
    api.demo.and.returnValue(of(response));
    api.me.and.returnValue(of(profile));
    api.logout.and.returnValue(of(void 0));
    router = { url: '/login', navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true) };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthApiService, useValue: api },
        { provide: Router, useValue: router },
        { provide: AuditStore, useValue: { register: jasmine.createSpy('register') } },
        { provide: NotificationStore, useValue: { add: jasmine.createSpy('add') } }
      ]
    });
  });

  afterEach(() => {
    for (const store of stores.splice(0)) store.ngOnDestroy();
    sessionStorage.removeItem(STORAGE_KEY);
    Object.defineProperty(window, 'BroadcastChannel', {
      configurable: true, writable: true, value: originalChannel
    });
    FakeBroadcastChannel.instances = [];
  });

  it('entrega a sessão à nova aba sem persistir token em localStorage', async () => {
    const first = newTab();
    first.demo().subscribe();
    expect(first.isAuthenticated()).toBeTrue();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    // Uma nova aba possui sessionStorage separado, mas encontra a aba já autenticada.
    sessionStorage.removeItem(STORAGE_KEY);
    const second = newTab();
    await second.waitForTabSession();

    expect(second.session()?.accessToken).toBe(response.accessToken);
    expect(second.isAuthenticated()).toBeTrue();
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}').accessToken).toBe(response.accessToken);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('replica login e logout, revogando somente a sessão correspondente', () => {
    const first = newTab();
    const second = newTab();
    first.demo().subscribe();
    expect(second.isAuthenticated()).toBeTrue();
    router.url = '/app/dashboard';

    first.logout();

    expect(second.isAuthenticated()).toBeFalse();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(api.logout).toHaveBeenCalledWith(response.accessToken);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('não restaura a sessão depois de um logout durante validação pendente', () => {
    const first = newTab();
    first.demo().subscribe();
    const pending = new Subject<AuthProfile>();
    api.me.and.returnValue(pending.asObservable());
    let accepted: boolean | undefined;
    first.validateSession().subscribe(valid => { accepted = valid; });

    first.logout();
    pending.next(profile);
    pending.complete();

    expect(accepted).toBeFalse();
    expect(first.isAuthenticated()).toBeFalse();
  });
});

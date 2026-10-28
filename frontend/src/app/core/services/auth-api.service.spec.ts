import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthApiService } from './auth-api.service';
import { MONAVERO_API_URL } from '../config/monavero-api';
import { authInterceptor } from '../interceptors/auth.interceptor';

describe('AuthApiService', () => {
  let api: AuthApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()]
    });
    api = TestBed.inject(AuthApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('envia credenciais somente à API Monavero', () => {
    api.login('teste@exemplo.com', 'senha-qualquer').subscribe();
    const req = http.expectOne(`${MONAVERO_API_URL}/api/v1/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.email).toBe('teste@exemplo.com');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ accessToken: 'x', expiresAt: '2030-01-01T00:00:00Z', user: { id: 'x', name: 'x', email: 'x', role: 'CLIENT', demo: false } });
  });
});

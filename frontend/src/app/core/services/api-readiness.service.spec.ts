import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { ApiReadinessService } from './api-readiness.service';
import { HttpErrorResponse } from '@angular/common/http';
import { defer, of, throwError } from 'rxjs';
import { MONAVERO_API_URL } from '../config/monavero-api';

const PROXY = '/api/monavero-readiness';
const DIRECT = `${MONAVERO_API_URL}/api/v1/system/info`;

function json(body: object, ok = true): Response {
  return { ok, json: () => Promise.resolve(body) } as Response;
}

function html(): Response {
  return { ok: true, json: () => Promise.reject(new SyntaxError('HTML em vez de JSON')) } as Response;
}

function mockEndpoints(proxy: () => Promise<Response>, direct: () => Promise<Response>): jasmine.Spy {
  return spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL) => {
    const url = String(input);
    if (url === PROXY) return proxy();
    if (url === DIRECT) return direct();
    return Promise.reject(new Error(`Endpoint inesperado: ${url}`));
  });
}

describe('ApiReadinessService', () => {
  let service: ApiReadinessService;
  beforeEach(() => TestBed.configureTestingModule({}));
  afterEach(() => service?.ngOnDestroy());

  it('libera quando o proxy retorna UP', fakeAsync(() => {
    const spy = mockEndpoints(
      () => Promise.resolve(json({ status: 'UP' })),
      () => Promise.reject(new Error('API direta inacessível'))
    );
    service = TestBed.inject(ApiReadinessService);
    let resolved = false;
    void service.waitUntilReady().then(() => { resolved = true; });
    flushMicrotasks();
    expect(service.ready()).toBeTrue();
    expect(resolved).toBeTrue();
    expect(spy).toHaveBeenCalledTimes(2);
  }));

  it('libera pelo endpoint Java mesmo com proxy quebrado', fakeAsync(() => {
    mockEndpoints(
      () => Promise.resolve(json({ message: 'proxy falhou' }, false)),
      () => Promise.resolve(json({ application: 'monavero-api', status: 'available' }))
    );
    service = TestBed.inject(ApiReadinessService);
    service.start();
    flushMicrotasks();
    expect(service.ready()).toBeTrue();
  }));

  it('não confunde HTML da Netlify/Blitz com API pronta', fakeAsync(() => {
    const spy = mockEndpoints(
      () => Promise.resolve(html()),
      () => Promise.resolve(json({ application: 'monavero-api', status: 'available' }))
    );
    service = TestBed.inject(ApiReadinessService);
    service.start();
    flushMicrotasks();
    expect(service.ready()).toBeTrue();
    expect(spy).toHaveBeenCalledTimes(2);
  }));

  it('mantém a espera quando ambos retornam indisponibilidade; tenta novamente', fakeAsync(() => {
    let attempts = 0;
    const spy = mockEndpoints(
      () => Promise.resolve(json({ status: 'DOWN' })),
      () => Promise.resolve(json(++attempts === 1
        ? { application: 'monavero-api', status: 'unavailable' }
        : { application: 'monavero-api', status: 'available' }))
    );
    service = TestBed.inject(ApiReadinessService);
    service.start();
    flushMicrotasks();
    expect(service.ready()).toBeFalse();
    tick(5_000);
    flushMicrotasks();
    expect(service.ready()).toBeTrue();
    expect(spy).toHaveBeenCalledTimes(4);
  }));

  it('não libera se ambos retornam conteúdo diferente do contrato da API', fakeAsync(() => {
    mockEndpoints(
      () => Promise.resolve(json({ status: 'available' })),
      () => Promise.resolve(json({ status: 'UP' }))
    );
    service = TestBed.inject(ApiReadinessService);
    service.start();
    flushMicrotasks();
    expect(service.ready()).toBeFalse();
    service.ngOnDestroy();
  }));

  it('revalida ao reencontrar indisponibilidade da API', fakeAsync(() => {
    mockEndpoints(
      () => Promise.resolve(json({ status: 'UP' })),
      () => Promise.resolve(json({ application: 'monavero-api', status: 'available' }))
    );
    service = TestBed.inject(ApiReadinessService);
    service.start();
    flushMicrotasks();
    expect(service.ready()).toBeTrue();
    service.markUnavailable();
    expect(service.ready()).toBeFalse();
    flushMicrotasks();
    expect(service.ready()).toBeTrue();
  }));

  it('recupera um 502 sem repetir credenciais inválidas', fakeAsync(() => {
    mockEndpoints(
      () => Promise.resolve(json({ status: 'UP' })),
      () => Promise.resolve(json({ application: 'monavero-api', status: 'available' }))
    );
    service = TestBed.inject(ApiReadinessService);
    service.start();
    flushMicrotasks();
    let attempts = 0;
    let result = '';
    const req = defer(() => {
      attempts++;
      return attempts === 1
        ? throwError(() => new HttpErrorResponse({ status: 502 }))
        : of('ok');
    });
    service.recover(req).subscribe(value => { result = value; });
    flushMicrotasks();
    expect(attempts).toBe(2);
    expect(result).toBe('ok');
  }));
});

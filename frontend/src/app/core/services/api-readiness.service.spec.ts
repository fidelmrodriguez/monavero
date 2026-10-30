import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { ApiReadinessService } from './api-readiness.service';
import { HttpErrorResponse } from '@angular/common/http';
import { defer, of, throwError } from 'rxjs';

/**
 * O JSON de um Response nativo usa Web Streams e pode resolver fora da fila
 * controlada pelo fakeAsync no Chrome Headless. Este dublê simula somente
 * os campos efetivamente consumidos pelo ApiReadinessService, mantendo o
 * parse JSON assíncrono de forma determinística nos testes.
 */
function response(body: string, contentType: string, ok = true): Response {
  return {
    ok,
    headers: new Headers({ 'Content-Type': contentType }),
    json: () => Promise.resolve(JSON.parse(body))
  } as Response;
}

describe('ApiReadinessService', () => {
  let service: ApiReadinessService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => service?.ngOnDestroy());

  it('libera a aplicação somente após health UP retornado pelo proxy do Netlify', fakeAsync(() => {
    const spy = spyOn(window, 'fetch').and.returnValue(Promise.resolve(response(
      JSON.stringify({ application: 'monavero-api', status: 'UP' }), 'application/json'
    )));
    service = TestBed.inject(ApiReadinessService);
    let resolved = false;
    void service.waitUntilReady().then(() => { resolved = true; });
    flushMicrotasks();
    expect(service.ready()).toBeTrue();
    expect(resolved).toBeTrue();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.calls.mostRecent().args[0]).toBe('/api/monavero-readiness');
  }));

  it('ignora a página HTML do Blitz e tenta novamente sem liberar login', fakeAsync(() => {
    const spy = spyOn(window, 'fetch').and.returnValues(
      Promise.resolve(response('<html>Waking up...</html>', 'text/html')),
      Promise.resolve(response(JSON.stringify({ application: 'monavero-api', status: 'UP' }), 'application/json'))
    );
    service = TestBed.inject(ApiReadinessService);
    service.start();
    flushMicrotasks();
    expect(service.ready()).toBeFalse();
    tick(5_000);
    flushMicrotasks();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(service.ready()).toBeTrue();
    expect(service.elapsedLabel()).toBe('00:05');
  }));


  it('não libera a aplicação em 503 e tenta novamente até o health UP', fakeAsync(() => {
    const spy = spyOn(window, 'fetch').and.returnValues(
      Promise.resolve(response('<html>API sleeping</html>', 'text/html', false)),
      Promise.resolve(response(JSON.stringify({ status: 'UP' }), 'application/json'))
    );
    service = TestBed.inject(ApiReadinessService);
    service.start();
    flushMicrotasks();
    expect(service.ready()).toBeFalse();
    tick(5_000);
    flushMicrotasks();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(service.ready()).toBeTrue();
  }));

  it('revalida a API após um novo sono da Blitz', fakeAsync(() => {
    const spy = spyOn(window, 'fetch').and.returnValue(Promise.resolve(response(
      JSON.stringify({ application: 'monavero-api', status: 'UP' }), 'application/json'
    )));
    service = TestBed.inject(ApiReadinessService);
    service.start();
    flushMicrotasks();
    expect(service.ready()).toBeTrue();
    service.markUnavailable();
    expect(service.ready()).toBeFalse();
    flushMicrotasks();
    expect(service.ready()).toBeTrue();
    expect(spy).toHaveBeenCalledTimes(2);
  }));

  it('repete a chamada quando a Blitz devolve 502 e a API acorda', fakeAsync(() => {
    spyOn(window, 'fetch').and.returnValue(Promise.resolve(response(
      JSON.stringify({ application: 'monavero-api', status: 'UP' }), 'application/json'
    )));
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
    expect(service.ready()).toBeTrue();
  }));

  it('não aceita health DOWN como confirmação de prontidão', fakeAsync(() => {
    const spy = spyOn(window, 'fetch').and.returnValue(Promise.resolve(response(
      JSON.stringify({ status: 'DOWN' }), 'application/json'
    )));
    service = TestBed.inject(ApiReadinessService);
    service.start();
    flushMicrotasks();
    expect(service.ready()).toBeFalse();
    expect(spy).toHaveBeenCalledTimes(1);
    // Sem isso, o relógio do polling mantém um timer periódico dentro de fakeAsync.
    service.ngOnDestroy();
  }));
});

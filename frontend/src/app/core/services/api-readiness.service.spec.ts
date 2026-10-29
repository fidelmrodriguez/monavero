import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { ApiReadinessService } from './api-readiness.service';
import { MONAVERO_API_URL } from '../config/monavero-api';

function response(body: string, contentType: string): Response {
  return new Response(body, { status: 200, headers: { 'Content-Type': contentType } });
}

describe('ApiReadinessService', () => {
  let service: ApiReadinessService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => service?.ngOnDestroy());

  it('libera a aplicação somente após o JSON da API Monavero', fakeAsync(() => {
    const spy = spyOn(window, 'fetch').and.returnValue(Promise.resolve(response(
      JSON.stringify({ application: 'monavero-api', status: 'available' }), 'application/json'
    )));
    service = TestBed.inject(ApiReadinessService);
    let resolved = false;
    void service.waitUntilReady().then(() => { resolved = true; });
    flushMicrotasks();
    expect(service.ready()).toBeTrue();
    expect(resolved).toBeTrue();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.calls.mostRecent().args[0]).toBe(`${MONAVERO_API_URL}/api/v1/system/info`);
  }));

  it('ignora a página HTML do Blitz e tenta novamente sem liberar login', fakeAsync(() => {
    const spy = spyOn(window, 'fetch').and.returnValues(
      Promise.resolve(response('<html>Waking up...</html>', 'text/html')),
      Promise.resolve(response(JSON.stringify({ application: 'monavero-api', status: 'available' }), 'application/json'))
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

  it('não aceita JSON de outro serviço como confirmação de prontidão', fakeAsync(() => {
    const spy = spyOn(window, 'fetch').and.returnValue(Promise.resolve(response(
      JSON.stringify({ application: 'outra-api', status: 'available' }), 'application/json'
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

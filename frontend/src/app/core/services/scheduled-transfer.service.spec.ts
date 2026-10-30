import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MONAVERO_API_URL } from '../config/monavero-api';
import { ScheduledTransferService } from './scheduled-transfer.service';

describe('ScheduledTransferService', () => {
  let service: ScheduledTransferService;
  let http: HttpTestingController;
  const url = `${MONAVERO_API_URL}/api/v1/banking/scheduled-transfers`;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ScheduledTransferService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('agenda na API e envia a chave idempotente', () => {
    const request = { originAccountId: 'a', destinationAgency: '0001', destinationAccountNumber: 'MV1234567890',
      amount: 75, description: '', scheduledFor: '2026-11-03T12:00:00.000Z',
      idempotencyKey: 'c94f8c31-abd6-49b1-bd99-d91d4072d2a9' };
    let received = '';
    service.create(request).subscribe(item => received = item.status);
    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ id: 's1', ...request, status: 'agendado' });
    expect(received).toBe('agendado');
  });

  it('consulta somente a rota autenticada e cancela pela API', () => {
    service.list().subscribe(items => expect(items).toEqual([]));
    const listRequest = http.expectOne(url);
    expect(listRequest.request.method).toBe('GET');
    listRequest.flush([]);
    service.cancel('s1').subscribe(item => expect(item.status).toBe('cancelado'));
    const request = http.expectOne(`${url}/s1`);
    expect(request.request.method).toBe('DELETE');
    request.flush({ id: 's1', status: 'cancelado' });
  });
  it('registra estados persistidos e comprovante no console sem expor conta completa', () => {
    const spy = spyOn(console, 'log');
    service.list().subscribe();
    http.expectOne(url).flush([{
      id: 'b02f2401-1234-4444-8888-123456789012', originAccountId: 'private-id',
      destinationAgency: '0001', destinationAccountNumber: 'MV1234567890',
      amount: 100, description: 'sigilosa', scheduledFor: '2026-11-03T12:00:00.000Z',
      createdAt: '2026-10-30T12:00:00.000Z', status: 'concluido',
      executedAt: '2026-11-03T12:00:00.000Z', transferId: 'private-transfer-id', failureReason: null
    }]);
    const messages = spy.calls.allArgs();
    expect(messages.some(args => String(args[0]).includes('Lista de agendamentos recebida da API'))).toBeTrue();
    expect(messages.some(args => String(args[0]).includes('Estado do agendamento na API') &&
      (args[1] as Record<string, unknown>)['temComprovante'] === true)).toBeTrue();
    expect(JSON.stringify(messages)).not.toContain('MV1234567890');
    expect(JSON.stringify(messages)).not.toContain('sigilosa');
    expect(JSON.stringify(messages)).not.toContain('private-transfer-id');
  });

});

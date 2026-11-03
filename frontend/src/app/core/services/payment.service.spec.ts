import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MONAVERO_API_URL } from '../config/monavero-api';
import { PaymentService, PaymentRequest } from './payment.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let http: HttpTestingController;
  const url = `${MONAVERO_API_URL}/api/v1/banking/payments`;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PaymentService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('envia o valor numérico, a referência e a chave idempotente para a API', () => {
    const body: PaymentRequest = {
      originAccountId: 'uuid-a', paymentType: 'BOLETO', beneficiary: 'Empresa exemplo',
      reference: 'FATURA2026A1', amount: 123.45, description: '',
      scheduledFor: null, idempotencyKey: 'fd9dbe7c-684d-4b45-8f01-0a88e4baf1d3'
    };
    service.create(body).subscribe(value => expect(value.status).toBe('concluido'));
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ id: 'p1', ...body, status: 'concluido', processedAt: new Date().toISOString() });
  });

  it('lista e cancela somente pelas rotas bancárias da API', () => {
    service.list().subscribe(items => expect(items.length).toBe(0));
    const list = http.expectOne(url);
    expect(list.request.method).toBe('GET');
    list.flush([]);
    service.cancel('payment-1').subscribe(item => expect(item.status).toBe('cancelado'));
    const cancel = http.expectOne(`${url}/payment-1`);
    expect(cancel.request.method).toBe('DELETE');
    cancel.flush({ id: 'payment-1', status: 'cancelado' });
  });

  it('logs não exibem beneficiário ou referência completa', () => {
    const log = spyOn(console, 'log');
    service.list().subscribe();
    http.expectOne(url).flush([{
      id: '4fe18f20-1111-4444-8888-aaaaaaaaaaaa', originAccountId: 'private-id-1',
      paymentType: 'BOLETO', beneficiary: 'BENEFICIARIO PRIVADO', reference: 'REFPRIVADA123',
      amount: 20, description: 'DESCRICAO PRIVADA', scheduledFor: null, createdAt: '2026-11-03T12:00:00Z',
      processedAt: '2026-11-03T12:00:00Z', status: 'concluido', failureReason: null
    }]);
    const events = JSON.stringify(log.calls.allArgs());
    expect(events).toContain('[Monavero][Teste E8] Estado do pagamento na API');
    expect(events).not.toContain('BENEFICIARIO PRIVADO');
    expect(events).not.toContain('REFPRIVADA123');
    expect(events).not.toContain('DESCRICAO PRIVADA');
  });
});

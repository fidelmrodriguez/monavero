import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BankingService } from './banking.service';
import { MONAVERO_API_URL } from '../config/monavero-api';
import { AuthStore } from '../state/auth.store';

describe('BankingService persistente', () => {
  let service: BankingService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthStore, useValue: { isDemo: () => false } }] });
    service = TestBed.inject(BankingService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('carrega contas e extrato somente da API autenticada, sem DummyJSON', () => {
    let total = -1;
    service.getOverview().subscribe(value => {
      expect(value.accounts[0].balance).toBe(450.5);
      expect(value.transactions.length).toBe(1);
      total = value.accounts[0].balance;
    });
    http.expectOne(`${MONAVERO_API_URL}/api/v1/banking/overview`).flush({
      accounts: [{ id: '1', label: 'Conta corrente', agency: '0001', number: 'MV001', balance: 450.5, currency: 'BRL' }],
      transactions: [{ id: '1', date: new Date().toISOString(), description: 'Teste', category: 'Recebimentos',
        type: 'entrada', status: 'concluido', amount: 450.5, channel: 'internet banking' }]
    });
    expect(total).toBe(450.5);
  });

  it('envia transferência com chave de idempotência ao backend', () => {
    const request = { originAccountId: '123', destinationAgency: '0001',
      destinationAccountNumber: 'MV98765', amount: 12.50,
      description: 'teste', idempotencyKey: 'c94f8c31-abd6-49b1-bd99-d91d4072d2a9' };
    let completed = false;
    service.transfer(request).subscribe(result => {
      expect(result.status).toBe('concluido');
      completed = true;
    });
    const call = http.expectOne(`${MONAVERO_API_URL}/api/v1/banking/transfers`);
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(request);
    call.flush({ id: 't1', originAccountId: '123', destinationAccountId: '456',
      amount: 12.50, executedAt: new Date().toISOString(), status: 'concluido' });
    expect(completed).toBeTrue();
  });

  it('não inventa saldos quando a API responde sem contas', () => {
    service.getOverview().subscribe(value => {
      expect(value.accounts).toEqual([]);
      expect(value.transactions).toEqual([]);
    });
    http.expectOne(`${MONAVERO_API_URL}/api/v1/banking/overview`).flush({ accounts: [], transactions: [] });
  });
});

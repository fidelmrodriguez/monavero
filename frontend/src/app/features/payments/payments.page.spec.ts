import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { BankingService } from '../../core/services/banking.service';
import { PaymentItem, PaymentService } from '../../core/services/payment.service';
import { PaymentsPage } from './payments.page';

describe('PaymentsPage', () => {
  let fixture: ComponentFixture<PaymentsPage>;
  let payments: jasmine.SpyObj<PaymentService>;
  const account = { id: '00000000-0000-4000-8000-000000000001', agency: '0001',
    number: 'MV1234567890', label: 'Conta corrente', balance: 1000, currency: 'BRL' };
  beforeEach(async () => {
    const banking = jasmine.createSpyObj('BankingService', ['getOverview']);
    banking.getOverview.and.returnValue(of({ accounts: [account], transactions: [],
      investments: [], cards: [], cashflow: [], expensesByCategory: [] }));
    payments = jasmine.createSpyObj('PaymentService', ['create', 'list', 'cancel']);
    payments.list.and.returnValue(of([]));
    await TestBed.configureTestingModule({ imports: [PaymentsPage], providers: [
      { provide: BankingService, useValue: banking }, { provide: PaymentService, useValue: payments }
    ] }).compileComponents();
    fixture = TestBed.createComponent(PaymentsPage);
    fixture.detectChanges();
  });

  it('apresenta formulário completo e histórico sem dados fictícios inventados', () => {
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Novo pagamento');
    expect(html.textContent).toContain('Histórico de pagamentos');
    expect(html.querySelector('#payment-amount')).not.toBeNull();
    expect(html.textContent).not.toContain('Teste E8');
  });

  it('não envia formulário inválido e exige data para agendar', () => {
    const component = fixture.componentInstance as any;
    component.setMode('agendado');
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('.payment-submit') as HTMLButtonElement).disabled).toBeTrue();
    component.submit();
    expect(payments.create).not.toHaveBeenCalled();
  });

  it('envia pagamento imediato, mantém centavos e atualiza a lista após confirmar', () => {
    const component = fixture.componentInstance as any;
    const input = fixture.nativeElement.querySelector('#payment-amount') as HTMLInputElement;
    input.value = 'R$ 25,35';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    component.form.patchValue({ paymentType: 'BOLETO', beneficiary: 'Empresa X', reference: 'FATURA2026A1' });
    expect(component.form.controls.amount.value).toBe(25.35);
    payments.create.and.callFake(request => of({
      id: 'payment-id', ...request, createdAt: new Date().toISOString(), processedAt: new Date().toISOString(),
      status: 'concluido', failureReason: null
    } as PaymentItem));
    component.submit();
    fixture.detectChanges();
    expect(payments.create).toHaveBeenCalled();
    expect(payments.create.calls.mostRecent().args[0].amount).toBe(25.35);
    expect(fixture.nativeElement.textContent).toContain('Pagamento concluído');
    expect(fixture.nativeElement.textContent).not.toContain('Teste E8');
  });

  it('mostra erro real de consulta sem criar pagamento local', () => {
    payments.list.and.returnValue(throwError(() => ({ status: 503 })));
    (fixture.componentInstance as any).reloadList();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar seus pagamentos');
    expect(payments.create).not.toHaveBeenCalled();
  });

  it('oferece cancelamento só para os agendados', () => {
    const list: PaymentItem[] = [{ id: 'p1', originAccountId: account.id, paymentType: 'BOLETO',
      beneficiary: 'Prestador', reference: 'FATURA2026A1', amount: 10,
      description: '', scheduledFor: new Date(Date.now() + 3600000).toISOString(),
      createdAt: new Date().toISOString(), processedAt: null, status: 'agendado', failureReason: null }];
    payments.list.and.returnValue(of(list));
    (fixture.componentInstance as any).reloadList();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.payment-entry button').length).toBe(1);
  });
});

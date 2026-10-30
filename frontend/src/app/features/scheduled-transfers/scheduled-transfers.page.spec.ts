import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { BankingService } from '../../core/services/banking.service';
import { ScheduledTransferService } from '../../core/services/scheduled-transfer.service';
import { AuthStore } from '../../core/state/auth.store';
import { ScheduledTransfersPage } from './scheduled-transfers.page';

describe('ScheduledTransfersPage', () => {
  let fixture: ComponentFixture<ScheduledTransfersPage>;
  let scheduling: jasmine.SpyObj<ScheduledTransferService>;
  beforeEach(async () => {
    const banking = jasmine.createSpyObj('BankingService', ['getOverview']);
    banking.getOverview.and.returnValue(of({ accounts: [
      { id: '00000000-0000-4000-8000-000000000001', agency: '0001', number: 'MV1234567890', label: 'Conta corrente', balance: 1000, currency: 'BRL' },
      { id: '00000000-0000-4000-8000-000000000002', agency: '0001', number: 'MV0987654321', label: 'Conta poupança', balance: 0, currency: 'BRL' }
    ], transactions: [], investments: [], cards: [], cashflow: [], expensesByCategory: [] }));
    scheduling = jasmine.createSpyObj('ScheduledTransferService', ['list', 'create', 'cancel']);
    scheduling.list.and.returnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [ScheduledTransfersPage],
      providers: [provideHttpClient(), { provide: BankingService, useValue: banking },
        { provide: ScheduledTransferService, useValue: scheduling },
        { provide: AuthStore, useValue: { isDemo: () => true } }]
    }).compileComponents();
    fixture = TestBed.createComponent(ScheduledTransfersPage);
    fixture.detectChanges();
  });

  it('exibe agência, conta e agendamento sem detalhes técnicos', () => {
    expect(fixture.nativeElement.textContent).toContain('Agendar transferência');
    expect(fixture.nativeElement.textContent).toContain('MV1234567890');
    expect(fixture.nativeElement.textContent).not.toContain('Teste da Etapa');
    expect((fixture.nativeElement.querySelector('#schedule-number') as HTMLInputElement).value).toBe('MV0987654321');
  });

  it('recusa campo de data vazio sem solicitar à API', () => {
    const submit = fixture.nativeElement.querySelector('.submit-schedule') as HTMLButtonElement;
    expect(submit.disabled).toBeTrue();
    expect(scheduling.create).not.toHaveBeenCalled();
  });

  it('mostra erro de carregamento sem inventar agendamentos', () => {
    scheduling.list.and.returnValue(throwError(() => ({ status: 503 })));
    (fixture.componentInstance as any).reloadList();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível consultar seus agendamentos');
  });
  it('registra falha da lista somente no console, mantendo mensagem de produto na tela', () => {
    const spy = spyOn(console, 'warn');
    scheduling.list.and.returnValue(throwError(() => ({ status: 503 })));
    (fixture.componentInstance as any).reloadList();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(
      '[Monavero][Teste E7] Falha ao consultar agendamentos', { httpStatus: 503 }
    );
    expect(fixture.nativeElement.textContent).not.toContain('Teste E7');
  });

});

describe('ScheduledTransfersPage - máscara do valor', () => {
  it('mantém os centavos numéricos para o payload de agendamento', async () => {
    const banking = jasmine.createSpyObj('BankingService', ['getOverview']);
    banking.getOverview.and.returnValue(of({ accounts: [
      { id: '00000000-0000-4000-8000-000000000001', agency: '0001', number: 'MV1234567890', label: 'Conta corrente', balance: 1000, currency: 'BRL' }
    ], transactions: [], investments: [], cards: [], cashflow: [], expensesByCategory: [] }));
    const scheduling = jasmine.createSpyObj('ScheduledTransferService', ['list', 'create', 'cancel']);
    scheduling.list.and.returnValue(of([]));
    scheduling.create.and.returnValue(of({ id: 'id-1', status: 'agendado' }));
    await TestBed.configureTestingModule({
      imports: [ScheduledTransfersPage],
      providers: [provideHttpClient(), { provide: BankingService, useValue: banking },
        { provide: ScheduledTransferService, useValue: scheduling },
        { provide: AuthStore, useValue: { isDemo: () => false } }]
    }).compileComponents();
    const fixture = TestBed.createComponent(ScheduledTransfersPage);
    fixture.detectChanges();
    const amount = fixture.nativeElement.querySelector('#schedule-amount') as HTMLInputElement;
    amount.value = 'R$ 123,45';
    amount.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(amount.value).toBe('R$ 123,45');
    expect((fixture.componentInstance as any).form.controls.amount.value).toBe(123.45);
  });
});

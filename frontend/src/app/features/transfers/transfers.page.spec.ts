import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DashboardOverview } from '../../core/models/banking.models';
import { BankingService } from '../../core/services/banking.service';
import { AuthStore } from '../../core/state/auth.store';
import { TransfersPage } from './transfers.page';

const overviewFixture: DashboardOverview = {
  accounts: [
    { id: 'd785cbbb-a054-4006-9cc9-663eeb9e1536', label: 'Conta corrente', agency: '0001',
      number: 'MV123456789012', balance: 10000, currency: 'BRL' },
    { id: '2ff15191-5e46-44da-b073-8b16e2e06d54', label: 'Conta poupança', agency: '0001',
      number: 'MV000001234567', balance: 0, currency: 'BRL' }
  ],
  investments: [], cards: [], transactions: [], cashflow: [], expensesByCategory: []
};

describe('TransfersPage', () => {
  let fixture: ComponentFixture<TransfersPage>;
  let bankingService: jasmine.SpyObj<BankingService>;
  beforeEach(async () => {
    bankingService = jasmine.createSpyObj('BankingService', ['getOverview', 'transfer']);
    bankingService.getOverview.and.returnValue(of(overviewFixture));
    bankingService.transfer.and.returnValue(of({
      id: '5a468cc2-5ef5-40c6-a882-3f3ba555a73b',
      originAccountId: overviewFixture.accounts[0].id,
      destinationAccountId: overviewFixture.accounts[1].id,
      amount: 25, executedAt: new Date().toISOString(), status: 'concluido'
    }));
    await TestBed.configureTestingModule({
      imports: [TransfersPage],
      providers: [provideRouter([]), provideHttpClient(),
        { provide: BankingService, useValue: bankingService },
        { provide: AuthStore, useValue: { role: () => 'cliente', isDemo: () => true } }]
    }).compileComponents();
    fixture = TestBed.createComponent(TransfersPage);
    fixture.detectChanges();
  });

  it('deve carregar a conta persistente e permitir selecionar outra conta própria', () => {
    expect(fixture.nativeElement.querySelector('#originAccount').value)
      .toBe(overviewFixture.accounts[0].id);
    const fill = fixture.nativeElement.querySelector('.own-account-shortcut') as HTMLButtonElement;
    expect(fill).not.toBeNull();
    fill.click();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#accountNumber') as HTMLInputElement).value)
      .toBe(overviewFixture.accounts[1].number);
  });

  it('mostra agência e número da origem e preenche o destino demo automaticamente', () => {
    expect(fixture.nativeElement.querySelector('.account-details').textContent).toContain('0001');
    expect(fixture.nativeElement.querySelector('.account-details').textContent).toContain('MV123456789012');
    expect((fixture.nativeElement.querySelector('#agency') as HTMLInputElement).value).toBe('0001');
    expect((fixture.nativeElement.querySelector('#accountNumber') as HTMLInputElement).value)
      .toBe(overviewFixture.accounts[1].number);
  });

  it('reserva feedback para os dois campos, sem desalinhá-los ao invalidar a agência', () => {
    const agency = fixture.nativeElement.querySelector('#agency') as HTMLInputElement;
    const target = fixture.nativeElement.querySelector('#accountNumber') as HTMLInputElement;
    agency.value = '000';
    agency.dispatchEvent(new Event('input'));
    agency.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.inner-grid .field-feedback').length).toBe(2);
    expect(fixture.nativeElement.querySelector('#agency-feedback').textContent).toContain('4 dígitos');
    expect(target.value).toBe(overviewFixture.accounts[1].number);
    expect((fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBeTrue();
    expect(bankingService.transfer).not.toHaveBeenCalled();
  });

  it('troca a origem e reconfigura o destino demo sem usar a mesma conta', () => {
    const source = fixture.nativeElement.querySelector('#originAccount') as HTMLSelectElement;
    source.value = overviewFixture.accounts[1].id;
    source.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#accountNumber') as HTMLInputElement).value)
      .toBe(overviewFixture.accounts[0].number);
  });

  it('envia para a API e confirma somente depois da resposta', () => {
    (fixture.nativeElement.querySelector('.own-account-shortcut') as HTMLButtonElement).click();
    const amount = fixture.nativeElement.querySelector('#amount') as HTMLInputElement;
    amount.value = '25';
    amount.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(bankingService.transfer).toHaveBeenCalledTimes(1);
    expect(bankingService.transfer.calls.mostRecent().args[0].amount).toBe(25);
    expect(fixture.nativeElement.textContent).toContain('realizada com sucesso');
  });

  it('mantém formulário utilizável e mostra HTTP 422 sem simular sucesso', () => {
    bankingService.transfer.and.returnValue(throwError(() => ({ status: 422 })));
    const amount = fixture.nativeElement.querySelector('#amount') as HTMLInputElement;
    amount.value = '25';
    amount.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Transferência recusada');
    expect((fixture.nativeElement.querySelector('#agency') as HTMLInputElement).value).toBe('0001');
    expect((fixture.nativeElement.querySelector('#accountNumber') as HTMLInputElement).value)
      .toBe(overviewFixture.accounts[1].number);
    expect(fixture.nativeElement.textContent).not.toContain('realizada com sucesso');
  });

  it('não reporta sucesso diante de falha da API', () => {
    bankingService.transfer.and.returnValue(throwError(() => ({ status: 422 })));
    (fixture.nativeElement.querySelector('.own-account-shortcut') as HTMLButtonElement).click();
    const amount = fixture.nativeElement.querySelector('#amount') as HTMLInputElement;
    amount.value = '25';
    amount.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Transferência recusada');
    expect(fixture.nativeElement.textContent).not.toContain('realizada com sucesso');
  });
  it('não exibe textos de etapa, testes ou tecnologia interna ao cliente', () => {
    const visible = fixture.nativeElement.textContent as string;
    expect(visible).not.toContain('Teste da Etapa');
    expect(visible).not.toContain('Etapa 7');
    expect(visible).not.toContain('Neon');
    expect(visible).not.toContain('PostgreSQL');
    expect(visible).not.toContain('destino demonstrativo');
    expect(visible).not.toContain('valores fictícios');
  });

  it('não sugere valor de transferência antes da escolha do cliente', () => {
    expect((fixture.nativeElement.querySelector('#amount') as HTMLInputElement).value).toBe('');
    expect((fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBeTrue();
  });

});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { Transaction } from '../../core/models/banking.models';
import { BankingService } from '../../core/services/banking.service';
import { StatementPage } from './statement.page';

const transactionsFixture: Transaction[] = [
  { id: 'trx-1', date: new Date().toISOString(), description: 'Recebimento via TED', category: 'Recebimentos', type: 'entrada', status: 'concluido', amount: 1000, channel: 'app' },
  { id: 'trx-2', date: new Date().toISOString(), description: 'Pagamento compartilhado',
    category: 'Transferências', type: 'transferencia', status: 'concluido', amount: 100,
    channel: 'internet banking', counterpartyName: 'Remetente Exemplo',
    counterpartyAgency: '0001', counterpartyAccount: '••••A8A9' }
];

const bankingServiceStub = {
  getTransactions: () => of(transactionsFixture)
};

describe('StatementPage', () => {
  let component: StatementPage;
  let fixture: ComponentFixture<StatementPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatementPage],
      providers: [{ provide: BankingService, useValue: bankingServiceStub }]
    }).compileComponents();

    fixture = TestBed.createComponent(StatementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar a página de extrato', () => {
    expect(component).toBeTruthy();
  });

  it('identifica o remetente real e a conta mascarada em transferências recebidas', () => {
    const html = fixture.nativeElement.textContent as string;
    expect(html).toContain('Recebido de');
    expect(html).toContain('Remetente Exemplo');
    expect(html).toContain('••••A8A9');
  });
});


describe('StatementPage - estados de carregamento', () => {
  let fixture: ComponentFixture<StatementPage>;
  let response: Subject<Transaction[]>;
  let getTransactions: jasmine.Spy;

  beforeEach(async () => {
    response = new Subject<Transaction[]>();
    getTransactions = jasmine.createSpy('getTransactions').and.returnValue(response.asObservable());
    await TestBed.configureTestingModule({
      imports: [StatementPage],
      providers: [{ provide: BankingService, useValue: { getTransactions } }]
    }).compileComponents();
    fixture = TestBed.createComponent(StatementPage);
    fixture.detectChanges();
  });

  it('mostra o carregamento enquanto aguarda o extrato, sem exibir estado vazio', () => {
    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Carregando suas movimentações');
    expect(content).not.toContain('Nenhuma movimentação encontrada');
  });

  it('exibe os lançamentos e encerra o carregamento quando a consulta termina', () => {
    response.next(transactionsFixture);
    response.complete();
    fixture.detectChanges();
    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Remetente Exemplo');
    expect(content).not.toContain('Carregando suas movimentações');
  });

  it('exibe opção de recuperação em erro, permitindo tentar novamente', () => {
    response.error(new Error('Conexão temporariamente indisponível'));
    fixture.detectChanges();
    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Não foi possível carregar suas movimentações');
    expect(content).toContain('Tentar novamente');
    expect(content).not.toContain('Nenhuma movimentação encontrada');

    getTransactions.and.returnValue(of(transactionsFixture));
    (fixture.nativeElement.querySelector('.data-error button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Remetente Exemplo');
    expect(fixture.nativeElement.textContent).not.toContain('Não foi possível carregar suas movimentações');
  });
});

describe('StatementPage - filtros monetários BRL', () => {
  let fixture: ComponentFixture<StatementPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatementPage],
      providers: [{ provide: BankingService, useValue: bankingServiceStub }]
    }).compileComponents();
    fixture = TestBed.createComponent(StatementPage);
    fixture.detectChanges();
  });

  it('aplica o filtro numérico após digitar um valor em reais com vírgula', () => {
    const min = fixture.nativeElement.querySelector('#minAmount') as HTMLInputElement;
    min.value = 'R$ 1.000,00';
    min.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(min.value).toBe('R$ 1.000,00');
    expect((fixture.componentInstance as any).form.controls.minAmount.value).toBe(1000);
    expect((fixture.componentInstance as any).filteredTransactions().length).toBe(1);
    (fixture.nativeElement.querySelector('.page-header button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(min.value).toBe('');
    expect((fixture.componentInstance as any).filteredTransactions().length).toBe(2);
  });
});

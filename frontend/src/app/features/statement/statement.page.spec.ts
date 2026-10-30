import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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

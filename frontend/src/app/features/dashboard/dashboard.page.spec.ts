import { CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { DashboardOverview } from '../../core/models/banking.models';
import { DashboardPage } from './dashboard.page';

const overviewFixture: DashboardOverview = {
  accounts: [
    { id: 'acc-1', label: 'Conta corrente', agency: '0001', number: '12345-6', balance: 1000, currency: 'BRL' }
  ],
  investments: [],
  cards: [],
  transactions: [
    { id: 'trx-1', date: new Date().toISOString(), description: 'Recebimento via TED', category: 'Recebimentos', type: 'entrada', status: 'concluido', amount: 1000, channel: 'app' },
    { id: 'trx-2', date: new Date().toISOString(), description: 'Compra dividida',
      category: 'Transferências', type: 'transferencia', status: 'concluido', amount: -50,
      channel: 'internet banking', counterpartyName: 'Destinatário Exemplo',
      counterpartyAgency: '0001', counterpartyAccount: '••••8899' }
  ],
  cashflow: [{ label: 'Jan', value: 1000 }],
  expensesByCategory: [{ label: 'Cartões', value: 400 }]
};

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        CurrencyPipe,
        DatePipe,
        PercentPipe,
        provideRouter([]),
        provideHttpClient(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { overview: overviewFixture } } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar a página de dashboard', () => {
    expect(component).toBeTruthy();
  });

  it('mostra o destinatário no extrato recente de transferências enviadas', () => {
    expect(fixture.nativeElement.textContent).toContain('Enviado para Destinatário Exemplo');
    expect(fixture.nativeElement.textContent).toContain('••••8899');
  });

  it('não mostra cartões ou investimentos fictícios', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toContain('CDB demonstrativo');
    expect(text).not.toContain('Visa');
  });
});

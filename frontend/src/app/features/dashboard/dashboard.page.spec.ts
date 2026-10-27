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
  investments: [
    { product: 'CDB Liquidez Diária', value: 2500, profitability: 4.2, risk: 'baixo' }
  ],
  cards: [
    { id: 'card-1', holder: 'User', brand: 'Visa', finalDigits: '1234', limit: 5000, used: 1200, dueDay: 10, status: 'ativo' }
  ],
  transactions: [
    { id: 'trx-1', date: new Date().toISOString(), description: 'Recebimento via TED', category: 'Recebimentos', type: 'entrada', status: 'concluido', amount: 1000, channel: 'app' }
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
});

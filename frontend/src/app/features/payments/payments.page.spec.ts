import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BankingService } from '../../core/services/banking.service';
import { PaymentsPage } from './payments.page';

const bankingServiceStub = {
  getScheduledPayments: () => [
    {
      id: 'pay-1',
      barCode: '34191790010104351004791020150008893740000032000',
      beneficiary: 'Energia Brasil',
      amount: 320,
      date: new Date().toISOString(),
      status: 'agendado' as const
    }
  ],
  addScheduledPayment: (payment: { barCode: string; beneficiary: string; amount: number; date: string }) => ({
    ...payment,
    id: 'pay-created',
    status: 'agendado' as const
  })
};

describe('PaymentsPage', () => {
  let component: PaymentsPage;
  let fixture: ComponentFixture<PaymentsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentsPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: BankingService, useValue: bankingServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar a página de pagamentos', () => {
    expect(component).toBeTruthy();
  });
});

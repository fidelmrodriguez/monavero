import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentsPage } from './payments.page';

describe('PaymentsPage', () => {
  let fixture: ComponentFixture<PaymentsPage>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PaymentsPage] }).compileComponents();
    fixture = TestBed.createComponent(PaymentsPage);
    fixture.detectChanges();
  });

  it('não simula um pagamento sem backend', () => {
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Pagamentos indisponíveis');
    expect(html.querySelector('form')).toBeNull();
    expect(html.querySelector('button[type="submit"]')).toBeNull();
  });
});

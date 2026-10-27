import { localDateInputValue } from '../../core/utils/formatters';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BankingService } from '../../core/services/banking.service';
import { NotificationStore } from '../../core/state/notification.store';
import { AuditStore } from '../../core/state/audit.store';
import { AuthStore } from '../../core/state/auth.store';
import { ScheduledPayment } from '../../core/models/banking.models';

@Component({
  selector: 'app-payments-page',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './payments.page.html',
  styleUrl: './payments.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentsPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly bankingService = inject(BankingService);
  private readonly notificationStore = inject(NotificationStore);
  private readonly auditStore = inject(AuditStore);
  private readonly authStore = inject(AuthStore);
  protected readonly scheduledPayments = signal<ScheduledPayment[]>(this.bankingService.getScheduledPayments());
  protected readonly today = localDateInputValue();

  protected readonly form = this.fb.group({
    barCode: ['34191.79001 01043.510047 91020.150008 8 93740000032000', [Validators.required, Validators.minLength(20)]],
    beneficiary: ['Energia Brasil', [Validators.required, Validators.minLength(3)]],
    amount: [320, [Validators.required, Validators.min(1)]],
    date: [this.today, [Validators.required]]
  });

  protected isInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payment = this.bankingService.addScheduledPayment({
      barCode: value.barCode,
      beneficiary: value.beneficiary,
      amount: value.amount,
      date: new Date(`${value.date}T12:00:00`).toISOString()
    });
    this.scheduledPayments.set(this.bankingService.getScheduledPayments());
    this.auditStore.register(`Pagamento agendado para ${payment.beneficiary}`, 'Pagamentos', 'sucesso', this.authStore.role());
    this.notificationStore.addNotification({
      title: 'Pagamento agendado',
      description: `${payment.beneficiary} adicionado à agenda demonstrativa, sem processamento bancário.`,
      type: 'success'
    });
    this.form.reset({ barCode: '', beneficiary: '', amount: 100, date: this.today });
  }
}

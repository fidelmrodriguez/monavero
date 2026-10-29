import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { BankingService } from '../../core/services/banking.service';
import { NotificationStore } from '../../core/state/notification.store';
import { AuditStore } from '../../core/state/audit.store';
import { AuthStore } from '../../core/state/auth.store';
import { AccountSummary, DashboardOverview, TransferRequest } from '../../core/models/banking.models';

@Component({
  selector: 'app-transfers-page',
  imports: [ReactiveFormsModule, CurrencyPipe],
  templateUrl: './transfers.page.html',
  styleUrl: './transfers.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransfersPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly bankingService = inject(BankingService);
  private readonly notifications = inject(NotificationStore);
  private readonly audit = inject(AuditStore);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly authStore = inject(AuthStore);

  protected readonly overview = signal<DashboardOverview | null>(null);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');
  private pendingRequest: TransferRequest | null = null;

  protected readonly accounts = computed(() => this.overview()?.accounts ?? [] as AccountSummary[]);
  protected readonly form = this.fb.group({
    originAccount: ['', [Validators.required]],
    agency: ['0001', [Validators.required, Validators.pattern(/^\d{4}$/)]],
    accountNumber: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9-]{5,20}$/)]],
    amount: [100, [Validators.required, Validators.min(0.01), Validators.max(50000)]],
    description: ['', [Validators.maxLength(160)]]
  });
  private readonly formValues = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() }
  );
  protected readonly selectedAccount = computed(() =>
    this.accounts().find(account => account.id === this.formValues().originAccount)
  );
  protected readonly demoTarget = computed(() =>
    this.authStore.isDemo() ? this.accounts().find(account => account.id !== this.formValues().originAccount) : undefined
  );
  protected readonly accountUnavailable = computed(() => !this.selectedAccount());
  protected readonly insufficientBalance = computed(() =>
    !!this.selectedAccount() && Number(this.formValues().amount) > this.selectedAccount()!.balance
  );

  constructor() { this.loadAccounts(); }

  protected fillDemoDestination(): void {
    const target = this.demoTarget();
    if (!target) return;
    this.form.patchValue({ agency: target.agency, accountNumber: target.number });
  }

  protected submit(): void {
    if (this.submitting() || this.loading()) return;
    this.error.set('');
    this.success.set('');
    if (this.form.invalid || this.accountUnavailable() || this.insufficientBalance()) {
      this.form.markAllAsTouched();
      return;
    }
    const values = this.form.getRawValue();
    // Reutilizar a mesma chave ao tentar novamente uma requisição de resultado incerto.
    // Qualquer alteração nos dados do formulário cria uma nova operação.
    const current = {
      originAccountId: values.originAccount,
      destinationAgency: values.agency.trim(),
      destinationAccountNumber: values.accountNumber.trim().toUpperCase(),
      amount: Number(values.amount),
      description: values.description.trim()
    };
    const request: TransferRequest = this.pendingRequest &&
      this.pendingRequest.originAccountId === current.originAccountId &&
      this.pendingRequest.destinationAgency === current.destinationAgency &&
      this.pendingRequest.destinationAccountNumber === current.destinationAccountNumber &&
      this.pendingRequest.amount === current.amount &&
      this.pendingRequest.description === current.description
      ? this.pendingRequest : { ...current, idempotencyKey: crypto.randomUUID() };
    this.pendingRequest = request;
    this.submitting.set(true);
    this.bankingService.transfer(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: receipt => {
        this.pendingRequest = null;
        this.success.set(`Transferência ${receipt.id.slice(0, 8)} confirmada e registrada no extrato.`);
        this.notifications.addNotification({
          title: 'Transferência concluída',
          description: `R$ ${receipt.amount.toFixed(2).replace('.', ',')} enviado entre contas Monavero.`,
          type: 'success'
        });
        this.audit.register('Transferência interna confirmada pela API', 'Transferências', 'sucesso', this.authStore.role());
        this.form.patchValue({ amount: 100, description: '' });
        this.loadAccounts();
        this.submitting.set(false);
      },
      error: err => {
        this.submitting.set(false);
        const status = err?.status;
        this.error.set(status === 422
          ? 'Transferência recusada: confira saldo, destino e situação das contas.'
          : status === 403 ? 'Você não tem permissão para transferir para essa conta.'
          : status === 409 ? 'Identificador já utilizado em outra transferência. Revise os dados.'
          : 'Não foi possível confirmar a operação. Você pode tentar novamente sem duplicar a transferência.');
      }
    });
  }

  private loadAccounts(): void {
    this.loading.set(true);
    this.bankingService.getOverview().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => {
        this.overview.set(data);
        const current = this.form.controls.originAccount.value;
        if (!data.accounts.some(account => account.id === current)) {
          this.form.controls.originAccount.setValue(data.accounts[0]?.id ?? '');
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar suas contas. Atualize a página para tentar novamente.');
        this.loading.set(false);
      }
    });
  }
}

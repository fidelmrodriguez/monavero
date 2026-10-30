import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { BankingService } from '../../core/services/banking.service';
import { NotificationStore } from '../../core/state/notification.store';
import { AuditStore } from '../../core/state/audit.store';
import { AuthStore } from '../../core/state/auth.store';
import { AccountSummary, DashboardOverview, TransferRequest, TransferReceipt } from '../../core/models/banking.models';
import { maskedAccount, testLog } from '../../core/utils/test-diagnostics';

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
    amount: ['', [Validators.required, Validators.min(0.01), Validators.max(50000)]],
    description: ['', [Validators.maxLength(160)]]
  });
  private readonly formValues = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() }
  );
  protected readonly selectedAccount = computed(() =>
    this.accounts().find(account => account.id === this.formValues().originAccount)
  );
  protected readonly otherAccount = computed(() =>
    this.accounts().find(account => account.id !== this.formValues().originAccount)
  );
  protected readonly accountUnavailable = computed(() => !this.selectedAccount());
  protected readonly insufficientBalance = computed(() =>
    !!this.selectedAccount() && Number(this.formValues().amount) > this.selectedAccount()!.balance
  );

  constructor() { this.loadAccounts(); }

  /** Preenche um destino pertencente ao mesmo titular. */
  protected fillDestination(account: AccountSummary): void {
    if (account.id === this.form.controls.originAccount.value) return;
    this.form.patchValue({ agency: account.agency, accountNumber: account.number });
    this.form.controls.agency.markAsUntouched();
    this.form.controls.accountNumber.markAsUntouched();
    this.error.set('');
    this.success.set('');
    testLog('6', 'Destino preenchido a partir da API', { conta: maskedAccount(account.number), agenciaValida: /^\d{4}$/.test(account.agency) });
  }

  protected fillOtherAccount(): void {
    const target = this.otherAccount();
    if (target) this.fillDestination(target);
  }

  protected onOriginChange(): void {
    this.error.set('');
    this.success.set('');
    if (this.authStore.isDemo()) this.fillOtherAccount();
  }

  protected normalizeDestination(): void {
    const original = this.form.controls.accountNumber.value;
    const normalized = original.trim().toUpperCase();
    if (original !== normalized) this.form.controls.accountNumber.setValue(normalized);
  }

  protected submit(): void {
    if (this.submitting() || this.loading()) return;
    this.error.set('');
    this.success.set('');
    this.normalizeDestination();
    if (this.form.invalid || this.accountUnavailable() || this.insufficientBalance()) {
      this.form.markAllAsTouched();
      testLog('6', 'Formulário bloqueado pela validação local', {
        origemValida: !this.accountUnavailable(),
        agenciaValida: this.form.controls.agency.valid,
        destinoValido: this.form.controls.accountNumber.valid,
        valorValido: this.form.controls.amount.valid && !this.insufficientBalance()
      }, true);
      return;
    }
    const values = this.form.getRawValue();
    const current = {
      originAccountId: values.originAccount,
      destinationAgency: values.agency.trim(),
      destinationAccountNumber: values.accountNumber.trim().toUpperCase(),
      amount: Number(values.amount),
      description: values.description.trim()
    };
    // Retentativas idênticas conservam a chave para impedir débito duplicado.
    const request: TransferRequest = this.pendingRequest &&
      this.pendingRequest.originAccountId === current.originAccountId &&
      this.pendingRequest.destinationAgency === current.destinationAgency &&
      this.pendingRequest.destinationAccountNumber === current.destinationAccountNumber &&
      this.pendingRequest.amount === current.amount &&
      this.pendingRequest.description === current.description
      ? this.pendingRequest : { ...current, idempotencyKey: crypto.randomUUID() };
    const retryMesmaOperacao = request === this.pendingRequest;
    this.pendingRequest = request;
    this.submitting.set(true);
    testLog('6', 'Enviando transferência à API', {
      origem: maskedAccount(this.selectedAccount()?.number ?? ''),
      destino: maskedAccount(current.destinationAccountNumber),
      valor: current.amount,
      retryMesmaOperacao
    });
    this.bankingService.transfer(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: receipt => {
        this.pendingRequest = null;
        this.success.set('Transferência realizada com sucesso. Confira os detalhes no extrato.');
        this.notifications.addNotification({
          title: 'Transferência concluída',
          description: `R$ ${receipt.amount.toFixed(2).replace('.', ',')} enviado entre contas Monavero.`,
          type: 'success'
        });
        this.audit.register('Transferência interna confirmada pela API', 'Transferências', 'sucesso', this.authStore.role());
        this.form.patchValue({ amount: '', description: '' });
        // Um novo formulário começa intocado. Caso contrário, o campo vazio
        // exibe um erro de validação mesmo após uma transferência concluída.
        this.form.controls.amount.markAsUntouched();
        this.form.controls.amount.markAsPristine();
        this.form.controls.description.markAsUntouched();
        this.form.controls.description.markAsPristine();
        this.loadAccounts(receipt, current.amount);
        this.submitting.set(false);
      },
      error: err => {
        this.submitting.set(false);
        const status = Number(err?.status ?? 0);
        this.error.set(status === 422
          ? 'Transferência recusada: confira saldo, destino e situação das contas.'
          : status === 403 ? 'Transferência não permitida para a conta informada.'
          : status === 409 ? 'Não foi possível processar esta solicitação. Revise os dados e tente novamente.'
          : 'Não foi possível confirmar a transferência. Tente novamente sem alterar os dados.');
        testLog('6', 'Transferência NÃO confirmada', { httpStatus: status, reenvioSeguro: true }, true);
      }
    });
  }

  private loadAccounts(receipt?: TransferReceipt, transferredAmount?: number): void {
    this.loading.set(true);
    this.bankingService.getOverview().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => {
        this.overview.set(data);
        const current = this.form.controls.originAccount.value;
        if (!data.accounts.some(account => account.id === current)) {
          this.form.controls.originAccount.setValue(data.accounts[0]?.id ?? '');
        }
        // Para contas de demonstração, facilita o preenchimento de outro destino do mesmo titular.
        if (this.authStore.isDemo() && !this.form.controls.accountNumber.value.trim()) {
          const target = data.accounts.find(a => a.id !== this.form.controls.originAccount.value);
          if (target) this.fillDestination(target);
        }
        this.loading.set(false);
        if (receipt) {
          const originFound = data.accounts.some(a => a.id === receipt.originAccountId);
          const destinationFound = data.accounts.some(a => a.id === receipt.destinationAccountId);
          testLog('6', 'Saldos consultados novamente após confirmação', {
            origemVisivel: originFound, destinoVisivel: destinationFound,
            valorTransferido: transferredAmount ?? receipt.amount,
            orientacao: 'Confira débito e crédito no extrato'
          });
        }
      },
      error: err => {
        this.error.set('Não foi possível carregar suas contas. Atualize a página para tentar novamente.');
        this.loading.set(false);
        testLog('6', 'Falha ao carregar contas', { httpStatus: Number(err?.status ?? 0) }, true);
      }
    });
  }
}

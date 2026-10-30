import { CurrencyPipe, DatePipe } from '@angular/common';
import { BrlCurrencyDirective } from '../../shared/directives/brl-currency.directive';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { BankingService } from '../../core/services/banking.service';
import { ScheduledTransfer, ScheduledTransferRequest, ScheduledTransferService } from '../../core/services/scheduled-transfer.service';
import { AccountSummary } from '../../core/models/banking.models';
import { AuthStore } from '../../core/state/auth.store';
import { maskedAccount, testLog } from '../../core/utils/test-diagnostics';

@Component({
  selector: 'app-scheduled-transfers',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, BrlCurrencyDirective],
  templateUrl: './scheduled-transfers.page.html',
  styleUrl: './scheduled-transfers.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScheduledTransfersPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly banking = inject(BankingService);
  private readonly scheduling = inject(ScheduledTransferService);
  private readonly auth = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly accounts = signal<AccountSummary[]>([]);
  protected readonly items = signal<ScheduledTransfer[]>([]);
  protected readonly loading = signal(true);
  protected readonly listingLoading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly cancelingId = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly listError = signal(false);
  protected readonly form = this.fb.group({
    originAccount: ['', Validators.required],
    agency: ['0001', [Validators.required, Validators.pattern(/^\d{4}$/)]],
    accountNumber: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9-]{5,20}$/)]],
    amount: ['', [Validators.required, Validators.min(0.01), Validators.max(50000)]],
    scheduledAt: ['', Validators.required],
    description: ['', Validators.maxLength(160)]
  });
  private readonly formValues = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() });
  protected readonly selectedAccount = computed(() =>
    this.accounts().find(a => a.id === this.formValues().originAccount));
  protected readonly otherAccount = computed(() =>
    this.accounts().find(a => a.id !== this.formValues().originAccount));
  private pendingRequest: ScheduledTransferRequest | null = null;

  constructor() { this.load(); }

  protected fillOtherAccount(): void {
    const target = this.otherAccount();
    if (target) this.form.patchValue({ agency: target.agency, accountNumber: target.number });
  }

  protected onOriginChange(): void {
    this.error.set('');
    if (this.auth.isDemo()) this.fillOtherAccount();
  }

  protected schedule(): void {
    if (this.submitting() || this.loading()) return;
    this.error.set('');
    this.success.set('');
    const accountNumber = this.form.controls.accountNumber.value.trim().toUpperCase();
    this.form.controls.accountNumber.setValue(accountNumber);
    const values = this.form.getRawValue();
    const date = new Date(values.scheduledAt);
    const dateValid = Number.isFinite(date.getTime()) &&
      date.getTime() >= Date.now() + 60_000 && date.getTime() <= Date.now() + 90 * 86400_000;
    if (this.form.invalid || !this.selectedAccount() || !dateValid) {
      testLog('7', 'Agendamento não enviado: campos inválidos', {
        camposInvalidos: this.form.invalid,
        contaOrigemSelecionada: Boolean(this.selectedAccount()),
        dataValida: dateValid
      }, true);
      this.form.markAllAsTouched();
      if (!dateValid) this.error.set('Escolha uma data entre um minuto e 90 dias a partir de agora.');
      return;
    }
    const payload = {
      originAccountId: values.originAccount,
      destinationAgency: values.agency.trim(),
      destinationAccountNumber: accountNumber,
      amount: Number(values.amount),
      description: values.description.trim(),
      scheduledFor: date.toISOString()
    };
    const old = this.pendingRequest;
    const request: ScheduledTransferRequest = old &&
      old.originAccountId === payload.originAccountId &&
      old.destinationAgency === payload.destinationAgency &&
      old.destinationAccountNumber === payload.destinationAccountNumber &&
      old.amount === payload.amount &&
      old.description === payload.description &&
      old.scheduledFor === payload.scheduledFor
      ? old : { ...payload, idempotencyKey: crypto.randomUUID() };
    this.pendingRequest = request;
    this.submitting.set(true);
    testLog('7', 'Enviando agendamento à API', {
      origem: maskedAccount(this.selectedAccount()!.number),
      destino: maskedAccount(request.destinationAccountNumber),
      valor: request.amount,
      previstoPara: request.scheduledFor,
      retryMesmaOperacao: old === request
    });
    this.scheduling.create(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: item => {
        this.submitting.set(false);
        if (!item.id || item.status !== 'agendado') {
          this.error.set('Não foi possível confirmar o agendamento.');
          testLog('7', 'Resposta de agendamento inesperada', {
            temReferencia: Boolean(item.id), status: item.status
          }, true);
          return;
        }
        this.pendingRequest = null;
        this.success.set('Transferência agendada. Acompanhe o andamento abaixo.');
        this.form.patchValue({ amount: '', scheduledAt: '', description: '' });
        this.form.controls.amount.markAsPristine();
        this.form.controls.amount.markAsUntouched();
        this.form.controls.scheduledAt.markAsPristine();
        this.form.controls.scheduledAt.markAsUntouched();
        this.items.update(items => [item, ...items.filter(i => i.id !== item.id)]);
        this.reloadList();
      },
      error: err => {
        this.submitting.set(false);
        this.error.set(Number(err?.status) === 422 ?
          'Confira os dados das contas e a data escolhida.' :
          'Não foi possível confirmar o agendamento. Tente novamente.');
        testLog('7', 'Falha ao agendar', { httpStatus: Number(err?.status ?? 0) }, true);
      }
    });
  }

  protected cancel(item: ScheduledTransfer): void {
    if (this.cancelingId() || item.status !== 'agendado') return;
    this.error.set('');
    this.success.set('');
    this.cancelingId.set(item.id);
    testLog('7', 'Solicitando cancelamento', {
      referencia: item.id.slice(0, 8), statusAnterior: item.status
    });
    this.scheduling.cancel(item.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => {
        this.cancelingId.set(null);
        this.items.update(items => items.map(current => current.id === item.id ? result : current));
        this.success.set('Agendamento cancelado.');
        if (result.status !== 'cancelado') {
          testLog('7', 'Cancelamento retornou estado inesperado', {
            referencia: item.id.slice(0, 8), status: result.status
          }, true);
        }
      },
      error: err => {
        this.cancelingId.set(null);
        this.error.set(Number(err?.status) === 409 ?
          'Este agendamento já foi processado. Atualize a lista.' :
          'Não foi possível cancelar o agendamento.');
        testLog('7', 'Falha ao cancelar agendamento', {
          referencia: item.id.slice(0, 8), httpStatus: Number(err?.status ?? 0)
        }, true);
        this.reloadList();
      }
    });
  }

  protected statusLabel(status: ScheduledTransfer['status']): string {
    return { agendado: 'Agendada', concluido: 'Concluída', cancelado: 'Cancelada', recusado: 'Não realizada' }[status];
  }

  protected reloadList(): void {
    this.listingLoading.set(true);
    this.listError.set(false);
    this.scheduling.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: items => {
        this.items.set(items);
        this.listingLoading.set(false);
      },
      error: err => {
        this.listError.set(true);
        this.listingLoading.set(false);
        testLog('7', 'Falha ao consultar agendamentos', { httpStatus: Number(err?.status ?? 0) }, true);
      }
    });
  }

  private load(): void {
    this.loading.set(true);
    this.banking.getOverview().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: overview => {
        this.accounts.set(overview.accounts);
        testLog('7', 'Contas disponíveis para agendamento', {
          contas: overview.accounts.length,
          possuiContaDeOrigem: overview.accounts.length > 0
        });
        this.form.controls.originAccount.setValue(overview.accounts[0]?.id ?? '');
        if (this.auth.isDemo()) this.fillOtherAccount();
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set('Não foi possível consultar suas contas.');
        testLog('7', 'Falha ao carregar contas para agendamento', {
          httpStatus: Number(err?.status ?? 0)
        }, true);
      }
    });
    this.reloadList();
  }
}

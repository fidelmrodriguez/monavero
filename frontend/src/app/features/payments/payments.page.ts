import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountSummary } from '../../core/models/banking.models';
import { BankingService } from '../../core/services/banking.service';
import { DemoBoleto, PaymentItem, PaymentRequest, PaymentService } from '../../core/services/payment.service';
import { maskedAccount, testLog } from '../../core/utils/test-diagnostics';
import { BrlCurrencyDirective } from '../../shared/directives/brl-currency.directive';

@Component({
  selector: 'app-payments-page',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, BrlCurrencyDirective],
  templateUrl: './payments.page.html',
  styleUrl: './payments.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentsPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly banking = inject(BankingService);
  private readonly payments = inject(PaymentService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly accounts = signal<AccountSummary[]>([]);
  protected readonly items = signal<PaymentItem[]>([]);
  protected readonly accountsLoading = signal(true);
  protected readonly listingLoading = signal(true);
  protected readonly listError = signal(false);
  protected readonly submitting = signal(false);
  protected readonly cancelingId = signal<string | null>(null);
  protected readonly mode = signal<'imediato' | 'agendado'>('imediato');
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly boleto = signal<DemoBoleto | null>(null);
  protected readonly lookupLoading = signal(false);
  protected readonly reviewing = signal(false);
  protected readonly receiptId = signal<string | null>(null);
  protected readonly boletoCode = this.fb.control('');
  protected readonly examples = [
    { code: '00090000000000000000000000000000000000000000001', label: 'R$ 15,00' },
    { code: '00090000000000000000000000000000000000000000002', label: 'R$ 12,00' },
    { code: '00090000000000000000000000000000000000000000003', label: 'R$ 5.000,00' },
    { code: '00090000000000000000000000000000000000000000004', label: 'Vencido' },
  ];
  protected readonly form = this.fb.group({
    originAccountId: ['', Validators.required],
    paymentType: ['BOLETO', Validators.required],
    beneficiary: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    reference: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9-]{6,48}$/)]],
    amount: ['', [Validators.required, Validators.min(0.01), Validators.max(50000)]],
    scheduledAt: [''],
    description: ['', Validators.maxLength(160)]
  });
  private pendingRequest: PaymentRequest | null = null;

  constructor() { this.loadAccounts(); this.reloadList(); }

  protected setMode(mode: 'imediato' | 'agendado'): void {
    this.mode.set(mode);
    this.error.set('');
    this.success.set('');
    this.form.controls.scheduledAt.setValue('');
    this.form.controls.scheduledAt.markAsUntouched();
    this.pendingRequest = null;
  }

  protected selectedAccount(): AccountSummary | undefined {
    return this.accounts().find(account => account.id === this.form.controls.originAccountId.value);
  }

  protected displayBeneficiary(name: string): string {
    return name.replace(/ \(teste\)$/, '');
  }

  protected lookup(code = this.boletoCode.value): void {
    if (this.lookupLoading()) return;
    this.boletoCode.setValue(code);
    this.boleto.set(null);
    this.form.patchValue({ beneficiary: '', reference: '', amount: '' });
    this.error.set('');
    this.success.set('');
    const digits = code.replace(/[.\s-]/g, '');
    if (!/^\d{47}$/.test(digits)) {
      this.error.set('Informe uma linha digitável com 47 dígitos.');
      return;
    }
    this.lookupLoading.set(true);
    this.payments.lookup(digits).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: boleto => {
        this.lookupLoading.set(false);
        this.boleto.set(boleto);
        this.form.patchValue({ beneficiary: boleto.beneficiary, reference: boleto.code, amount: String(boleto.amount) });
      },
      error: err => {
        this.lookupLoading.set(false);
        this.error.set(err.status === 404 ? 'Boleto demonstrativo não encontrado.' :
          err.status === 409 ? 'Este boleto já foi pago ou agendado.' :
          err.status === 422 ? 'Este boleto demonstrativo está vencido.' : 'Não foi possível consultar o boleto.');
      }
    });
  }

  protected changePaymentType(): void {
    this.boleto.set(null);
    this.boletoCode.reset();
    this.form.patchValue({ beneficiary: '', reference: '', amount: '' });
    this.error.set('');
    this.success.set('');
  }

  protected submit(): void {
    if (this.accountsLoading() || this.submitting() || this.lookupLoading()) return;
    this.error.set('');
    this.success.set('');
    this.form.controls.beneficiary.setValue(this.form.controls.beneficiary.value.trim());
    this.form.controls.reference.setValue(this.form.controls.reference.value.trim().toUpperCase());
    const value = this.form.getRawValue();
    const scheduled = this.mode() === 'agendado' ? new Date(value.scheduledAt) : null;
    const validDate = scheduled === null || (Number.isFinite(scheduled.getTime()) &&
      scheduled.getTime() >= Date.now() + 60_000 && scheduled.getTime() <= Date.now() + 90 * 86_400_000);
    if (this.form.invalid || !this.selectedAccount() || !validDate ||
        (value.paymentType === 'BOLETO' && !this.boleto())) {
      this.form.markAllAsTouched();
      this.error.set(!validDate ? 'Escolha uma data entre um minuto e 90 dias a partir de agora.' :
        'Confira os campos do pagamento.');
      testLog('8', 'Pagamento não enviado: campos inválidos', {
        formularioInvalido: this.form.invalid,
        dataValida: validDate,
        possuiConta: Boolean(this.selectedAccount())
      }, true);
      return;
    }
    const payload = {
      originAccountId: value.originAccountId,
      paymentType: value.paymentType as PaymentRequest['paymentType'],
      beneficiary: value.beneficiary.trim(),
      reference: value.reference.trim().toUpperCase(),
      amount: Number(value.amount),
      description: value.description.trim(),
      scheduledFor: scheduled ? scheduled.toISOString() : null
    };
    const boleto = this.boleto();
    if (boleto && scheduled && value.scheduledAt.slice(0, 10) > boleto.dueDate) {
      this.error.set('Escolha uma data até o vencimento do boleto.');
      return;
    }
    if (!this.reviewing()) {
      this.reviewing.set(true);
      return;
    }
    const old = this.pendingRequest;
    const request: PaymentRequest = old &&
      old.originAccountId === payload.originAccountId && old.paymentType === payload.paymentType &&
      old.beneficiary === payload.beneficiary && old.reference === payload.reference &&
      old.amount === payload.amount && old.description === payload.description &&
      old.scheduledFor === payload.scheduledFor
        ? old : { ...payload, idempotencyKey: crypto.randomUUID() };
    this.pendingRequest = request;
    this.submitting.set(true);
    testLog('8', 'Enviando pagamento à API', {
      origem: maskedAccount(this.selectedAccount()!.number), tipo: request.paymentType,
      valor: request.amount, agendado: Boolean(request.scheduledFor),
      retryMesmaOperacao: old === request
    });
    this.payments.create(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: item => {
        this.submitting.set(false);
        const expected = request.scheduledFor ? 'agendado' : 'concluido';
        if (!item.id || item.status !== expected || Number(item.amount) !== request.amount) {
          this.error.set('A resposta do pagamento não pôde ser confirmada. Consulte o histórico antes de tentar novamente.');
          testLog('8', 'Resposta inesperada do pagamento', { status: item.status, temReferencia: Boolean(item.id) }, true);
          this.reloadList();
          return;
        }
        this.pendingRequest = null;
        this.reviewing.set(false);
        this.boleto.set(null);
        this.boletoCode.reset();
        this.success.set(request.scheduledFor ? 'Pagamento agendado. Acompanhe o andamento no histórico.' :
          'Pagamento concluído. Confira o lançamento no extrato.');
        this.form.patchValue({ amount: '', beneficiary: '', reference: '', description: '', scheduledAt: '' });
        for (const control of [this.form.controls.amount, this.form.controls.beneficiary,
          this.form.controls.reference, this.form.controls.scheduledAt]) {
          control.markAsPristine(); control.markAsUntouched();
        }
        this.items.update(items => [item, ...items.filter(p => p.id !== item.id)]);
        this.reloadList();
        if (!request.scheduledFor) this.refreshBalances();
      },
      error: err => {
        this.submitting.set(false);
        const status = Number(err?.status ?? 0);
        this.error.set(status === 422 ? 'Saldo insuficiente ou conta indisponível. Confira os dados.' :
          status === 401 ? 'Sua sessão expirou. Entre novamente para continuar.' :
          status === 409 ? 'Este boleto pode já estar pago ou agendado. Confira o histórico.' :
          'Não foi possível confirmar o pagamento. Confira o histórico antes de tentar novamente.');
        testLog('8', 'Falha ao pagar ou agendar', { httpStatus: status }, true);
      }
    });
  }

  protected cancel(item: PaymentItem): void {
    if (item.status !== 'agendado' || this.cancelingId()) return;
    this.error.set(''); this.success.set('');
    this.cancelingId.set(item.id);
    testLog('8', 'Solicitando cancelamento de pagamento', { referencia: item.id.slice(0, 8) });
    this.payments.cancel(item.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => {
        this.cancelingId.set(null);
        this.items.update(items => items.map(current => current.id === item.id ? result : current));
        this.success.set('Pagamento agendado cancelado.');
      },
      error: err => {
        this.cancelingId.set(null);
        this.error.set(Number(err?.status) === 409 ?
          'O pagamento já foi processado. Atualize o histórico.' : 'Não foi possível cancelar o pagamento.');
        testLog('8', 'Falha no cancelamento', { httpStatus: Number(err?.status ?? 0) }, true);
        this.reloadList();
      }
    });
  }

  protected reloadList(): void {
    this.listingLoading.set(true);
    this.listError.set(false);
    this.payments.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: items => { this.items.set(items); this.listingLoading.set(false); },
      error: err => {
        this.listingLoading.set(false); this.listError.set(true);
        testLog('8', 'Falha ao carregar histórico de pagamentos', { httpStatus: Number(err?.status ?? 0) }, true);
      }
    });
  }

  protected statusLabel(status: PaymentItem['status']): string {
    return { agendado: 'Agendado', concluido: 'Concluído', cancelado: 'Cancelado', recusado: 'Não realizado' }[status];
  }
  protected typeLabel(type: PaymentItem['paymentType']): string {
    return type === 'BOLETO' ? 'Boleto' : 'Convênio';
  }

  private loadAccounts(): void {
    this.accountsLoading.set(true);
    this.banking.getOverview().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: overview => {
        this.accounts.set(overview.accounts);
        if (!this.form.controls.originAccountId.value) {
          this.form.controls.originAccountId.setValue(overview.accounts[0]?.id ?? '');
        }
        this.accountsLoading.set(false);
        testLog('8', 'Contas disponíveis para pagamento', { contas: overview.accounts.length });
      },
      error: err => {
        this.accountsLoading.set(false);
        this.error.set('Não foi possível carregar suas contas.');
        testLog('8', 'Falha ao carregar contas', { httpStatus: Number(err?.status ?? 0) }, true);
      }
    });
  }

  private refreshBalances(): void {
    this.banking.getOverview().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: overview => {
        this.accounts.set(overview.accounts);
        testLog('8', 'Saldos atualizados após pagamento', {
          contas: overview.accounts.length, lancamentos: overview.transactions.length
        });
      },
      error: err => testLog('8', 'Falha ao atualizar saldo após pagamento', {
        httpStatus: Number(err?.status ?? 0)
      }, true)
    });
  }
}

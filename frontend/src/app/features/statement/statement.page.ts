import { CurrencyPipe, DatePipe } from '@angular/common';
import { BrlCurrencyDirective } from '../../shared/directives/brl-currency.directive';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs';
import { BankingService } from '../../core/services/banking.service';
import { Transaction, TransactionStatus, TransactionType } from '../../core/models/banking.models';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

interface StatementFilters {
  text: string;
  type: '' | TransactionType;
  status: '' | TransactionStatus;
  minAmount: number | null;
  maxAmount: number | null;
  period: '7' | '15' | '30' | '90' | 'all';
}

@Component({
  selector: 'app-statement-page',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, EmptyStateComponent, BrlCurrencyDirective],
  templateUrl: './statement.page.html',
  styleUrl: './statement.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatementPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly bankingService = inject(BankingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly transactions = signal<Transaction[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  constructor() { this.reload(); }

  protected reload(): void {
    if (this.loading() && this.hasRequested) return;
    this.hasRequested = true;
    this.loading.set(true);
    this.loadError.set(false);
    this.bankingService.getTransactions().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: transactions => {
        this.transactions.set(transactions);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      }
    });
  }

  private hasRequested = false;

  protected readonly form = this.fb.group({
    text: [''],
    type: ['' as StatementFilters['type']],
    status: ['' as StatementFilters['status']],
    minAmount: [null as number | null],
    maxAmount: [null as number | null],
    period: ['30' as StatementFilters['period']]
  });

  private readonly filters = toSignal(this.form.valueChanges.pipe(
    startWith(this.form.getRawValue()),
    map(() => this.form.getRawValue())
  ), { initialValue: this.form.getRawValue() });

  protected readonly filteredTransactions = computed(() => {
    const filters = this.filters();
    const text = filters.text.trim().toLowerCase();
    const min = filters.minAmount;
    const max = filters.maxAmount;
    const now = Date.now();

    return this.transactions().filter((transaction) => {
      const absoluteAmount = Math.abs(transaction.amount);
      const inText = !text || `${transaction.description} ${transaction.category} ${transaction.counterpartyName ?? ''} ${transaction.counterpartyAccount ?? ''}`.toLowerCase().includes(text);
      const inType = !filters.type || transaction.type === filters.type;
      const inStatus = !filters.status || transaction.status === filters.status;
      const inMin = min === null || min === undefined || absoluteAmount >= Number(min);
      const inMax = max === null || max === undefined || absoluteAmount <= Number(max);
      const inPeriod = filters.period === 'all' || (now - new Date(transaction.date).getTime()) <= Number(filters.period) * 24 * 60 * 60 * 1000;
      return inText && inType && inStatus && inMin && inMax && inPeriod;
    });
  });

  protected readonly totalIn = computed(() => this.filteredTransactions().filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0));
  protected readonly totalOut = computed(() => this.filteredTransactions().filter((item) => item.amount < 0).reduce((sum, item) => sum + item.amount, 0));
  protected readonly balance = computed(() => this.totalIn() + this.totalOut());

  protected resetFilters(): void {
    this.form.reset({ text: '', type: '', status: '', minAmount: null, maxAmount: null, period: '30' });
  }
}

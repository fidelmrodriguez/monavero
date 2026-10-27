import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
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
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, EmptyStateComponent],
  templateUrl: './statement.page.html',
  styleUrl: './statement.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatementPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly bankingService = inject(BankingService);
  private readonly transactions = toSignal(this.bankingService.getTransactions(), { initialValue: [] as Transaction[] });

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
      const inText = !text || `${transaction.description} ${transaction.category}`.toLowerCase().includes(text);
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

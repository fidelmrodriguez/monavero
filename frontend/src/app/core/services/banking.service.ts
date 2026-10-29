import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { MONAVERO_API_URL } from '../config/monavero-api';
import { AccountSummary, DashboardOverview, FinancePoint, ScheduledPayment, Transaction } from '../models/banking.models';
import { AuthStore } from '../state/auth.store';
import { ApiReadinessService } from './api-readiness.service';
import { uid } from '../utils/formatters';

interface BankingResponse {
  accounts: AccountSummary[];
  transactions: Transaction[];
}

/** Contas e extratos sempre vêm do Neon, por usuário autenticado. */
@Injectable({ providedIn: 'root' })
export class BankingService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthStore);
  private readonly apiReadiness = inject(ApiReadinessService);
  private readonly url = `${MONAVERO_API_URL}/api/v1/banking/overview`;

  private readonly scheduledPayments: ScheduledPayment[] = [
    {
      id: 'pay-001',
      barCode: '34191.79001 01043.510047 91020.150008 8 93740000032000',
      beneficiary: 'Energia Brasil', amount: 320,
      date: new Date(Date.now() + 2 * 86400000).toISOString(), status: 'agendado'
    }
  ];

  /** Sem cache compartilhado entre usuários: logout/login não reutiliza saldos antigos. */
  getOverview(): Observable<DashboardOverview> {
    return this.apiReadiness.recover(this.http.get<BankingResponse>(this.url)).pipe(
      map(response => this.toOverview(response))
    );
  }

  getTransactions(): Observable<Transaction[]> {
    return this.apiReadiness.recover(this.http.get<BankingResponse>(this.url)).pipe(
      map(response => response.transactions)
    );
  }

  getScheduledPayments(): ScheduledPayment[] { return [...this.scheduledPayments]; }

  addScheduledPayment(payment: Omit<ScheduledPayment, 'id' | 'status'>): ScheduledPayment {
    const scheduled: ScheduledPayment = { ...payment, id: uid('pay'), status: 'agendado' };
    this.scheduledPayments.unshift(scheduled);
    return scheduled;
  }

  private toOverview(response: BankingResponse): DashboardOverview {
    const transactions = response.transactions ?? [];
    // Investimentos e cartões pertencem a etapas futuras: somente a conta demo
    // exibe amostras explicitamente fictícias. Saldos e extrato nunca são inventados.
    const demo = this.auth.isDemo();
    return {
      accounts: response.accounts ?? [],
      transactions,
      investments: demo ? [
        { product: 'CDB demonstrativo', value: 15000, profitability: 4.8, risk: 'baixo' }
      ] : [],
      cards: demo ? [
        { id: 'demo-card', holder: 'Demonstração Monavero', brand: 'Visa', finalDigits: '4219',
          limit: 12000, used: 2500, dueDay: 12, status: 'ativo' }
      ] : [],
      cashflow: this.monthlyCashflow(transactions),
      expensesByCategory: this.expenses(transactions)
    };
  }

  private monthlyCashflow(transactions: Transaction[]): FinancePoint[] {
    const months: FinancePoint[] = [];
    const now = new Date();
    for (let offset = 5; offset >= 0; offset--) {
      const month = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const year = month.getFullYear();
      const number = month.getMonth();
      const value = transactions
        .filter(tx => {
          const date = new Date(tx.date);
          return date.getFullYear() === year && date.getMonth() === number;
        })
        .reduce((total, tx) => total + tx.amount, 0);
      months.push({ label: month.toLocaleString('pt-BR', { month: 'short' }), value });
    }
    return months;
  }

  private expenses(transactions: Transaction[]): FinancePoint[] {
    const totals = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.amount >= 0) continue;
      totals.set(tx.category, (totals.get(tx.category) ?? 0) + Math.abs(tx.amount));
    }
    return [...totals.entries()].map(([label, value]) => ({ label, value }));
  }
}

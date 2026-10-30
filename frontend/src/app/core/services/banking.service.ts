import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, tap, throwError } from 'rxjs';
import { MONAVERO_API_URL } from '../config/monavero-api';
import { AccountSummary, DashboardOverview, FinancePoint, Transaction, TransferReceipt, TransferRequest } from '../models/banking.models';
import { ApiReadinessService } from './api-readiness.service';
import { testLog } from '../utils/test-diagnostics';

interface BankingResponse {
  accounts: AccountSummary[];
  transactions: Transaction[];
}

/** Contas e extratos sempre vêm do Neon, por usuário autenticado. */
@Injectable({ providedIn: 'root' })
export class BankingService {
  private readonly http = inject(HttpClient);
  private readonly apiReadiness = inject(ApiReadinessService);
  private readonly url = `${MONAVERO_API_URL}/api/v1/banking/overview`;

  /** Sem cache compartilhado entre usuários: logout/login não reutiliza saldos antigos. */
  getOverview(): Observable<DashboardOverview> {
    return this.apiReadiness.recover(this.http.get<BankingResponse>(this.url)).pipe(
      map(response => this.toOverview(response)),
      tap(overview => testLog('5', 'Dashboard/contas recebidos da API', {
        contas: overview.accounts.length, lancamentos: overview.transactions.length,
        saldosDisponiveis: overview.accounts.every(account => Number.isFinite(account.balance))
      })),
      catchError(error => this.logApiFailure('5', 'Falha no carregamento do dashboard', error))
    );
  }

  /** Uma tentativa usa sempre a mesma chave; o backend garante idempotência. */
  transfer(request: TransferRequest): Observable<TransferReceipt> {
    return this.apiReadiness.recover(
      this.http.post<TransferReceipt>(`${MONAVERO_API_URL}/api/v1/banking/transfers`, request)
    ).pipe(
      map(receipt => {
        // Uma resposta inesperada não pode ser apresentada como operação confirmada.
        if (!receipt || receipt.status !== 'concluido' || !receipt.id ||
            !receipt.destinationAccountId || receipt.destinationAccountId === receipt.originAccountId ||
            receipt.originAccountId !== request.originAccountId ||
            !Number.isFinite(Number(receipt.amount)) || Math.abs(Number(receipt.amount) - request.amount) > 0.001) {
          throw new Error('Comprovante inválido retornado pela API');
        }
        return { ...receipt, amount: Number(receipt.amount) };
      }),
      tap(receipt => testLog('6', 'API confirmou transferência', {
        status: receipt.status, valor: receipt.amount, comprovanteRecebido: Boolean(receipt.id),
        referencia: receipt.id.slice(0, 8)
      })),
      catchError(error => this.logApiFailure('6', 'API não confirmou transferência', error))
    );
  }

  getTransactions(): Observable<Transaction[]> {
    return this.apiReadiness.recover(this.http.get<BankingResponse>(this.url)).pipe(
      map(response => response.transactions),
      tap(transactions => testLog('5', 'Extrato recebido da API', { lancamentos: transactions.length,
        debitos: transactions.filter(tx => tx.amount < 0).length,
        creditos: transactions.filter(tx => tx.amount > 0).length })),
      catchError(error => this.logApiFailure('5', 'Falha no carregamento do extrato', error))
    );
  }

  private logApiFailure(etapa: '5' | '6', label: string, error: unknown): Observable<never> {
    const status = Number((error as { status?: number })?.status ?? 0);
    testLog(etapa, label, { httpStatus: status,
      orientacao: status === 0 ? 'Verificar conectividade/CORS da API' : 'Consultar a aba Rede (Network)' }, true);
    return throwError(() => error);
  }

  private toOverview(response: BankingResponse): DashboardOverview {
    const transactions = response.transactions ?? [];
    // Nenhum produto financeiro é inventado pelo frontend.
    return {
      accounts: response.accounts ?? [],
      transactions,
      investments: [],
      cards: [],
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

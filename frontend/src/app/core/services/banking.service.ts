import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, shareReplay } from 'rxjs';
import { AccountSummary, CardSummary, DashboardOverview, FinancePoint, InvestmentSummary, ScheduledPayment, Transaction } from '../models/banking.models';
import { uid } from '../utils/formatters';

interface ExternalUsersResponse {
  users: Array<{ id: number; firstName: string; lastName: string; bank?: { iban?: string; cardNumber?: string; cardType?: string; cardExpire?: string } }>;
}

interface ExternalProductsResponse {
  products: Array<{ id: number; title: string; price: number; category: string; rating: number }>;
}

interface ExternalCartsResponse {
  carts: Array<{ id: number; total: number; discountedTotal: number; products: Array<{ title: string; price: number; quantity: number }> }>;
}

@Injectable({ providedIn: 'root' })
export class BankingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://dummyjson.com';
  private overviewCache$?: Observable<DashboardOverview>;
  private readonly scheduledPayments: ScheduledPayment[] = [
    {
      id: 'pay-001',
      barCode: '34191.79001 01043.510047 91020.150008 8 93740000032000',
      beneficiary: 'Energia Brasil',
      amount: 320,
      date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
      status: 'agendado'
    }
  ];

  getOverview(): Observable<DashboardOverview> {
    this.overviewCache$ ??= forkJoin({
      users: this.http.get<ExternalUsersResponse>(`${this.baseUrl}/users?limit=8`),
      products: this.http.get<ExternalProductsResponse>(`${this.baseUrl}/products?limit=12`),
      carts: this.http.get<ExternalCartsResponse>(`${this.baseUrl}/carts?limit=6`)
    }).pipe(
      map(({ users, products, carts }) => this.mapToOverview(users, products, carts)),
      catchError(() => of(this.fallbackOverview())),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    return this.overviewCache$;
  }

  getTransactions(): Observable<Transaction[]> {
    return this.getOverview().pipe(map((overview) => overview.transactions));
  }

  getScheduledPayments(): ScheduledPayment[] {
    return [...this.scheduledPayments];
  }

  addScheduledPayment(payment: Omit<ScheduledPayment, 'id' | 'status'>): ScheduledPayment {
    const scheduled: ScheduledPayment = { ...payment, id: uid('pay'), status: 'agendado' };
    this.scheduledPayments.unshift(scheduled);
    return scheduled;
  }

  private mapToOverview(usersResponse: ExternalUsersResponse, productsResponse: ExternalProductsResponse, cartsResponse: ExternalCartsResponse): DashboardOverview {
    const accounts: AccountSummary[] = [
      {
        id: 'acc-corrente',
        label: 'Conta corrente',
        agency: '0001',
        number: '48291-7',
        balance: 84720.35,
        currency: 'BRL'
      },
      {
        id: 'acc-salario',
        label: 'Conta salário',
        agency: '0001',
        number: '67210-3',
        balance: 12650.9,
        currency: 'BRL'
      }
    ];

    const investments: InvestmentSummary[] = productsResponse.products.slice(0, 4).map((product, index) => ({
      product: ['CDB Liquidez Diária', 'Fundo DI Conservador', 'Tesouro Selic', 'Carteira Protegida'][index] ?? product.title,
      value: Math.round((product.price * 1200) + (index * 8300)),
      profitability: Number((product.rating + index * 0.42).toFixed(2)),
      risk: index < 2 ? 'baixo' : index === 2 ? 'medio' : 'alto'
    }));

    const cards: CardSummary[] = usersResponse.users.slice(0, 3).map((user, index) => ({
      id: `card-${user.id}`,
      holder: 'User',
      brand: user.bank?.cardType ?? ['Visa', 'Mastercard', 'Elo'][index] ?? 'Visa',
      finalDigits: (user.bank?.cardNumber ?? `000000000000${4321 + index}`).slice(-4),
      limit: 12000 + index * 6500,
      used: 2400 + index * 1680,
      dueDay: [8, 14, 22][index] ?? 10,
      status: index === 2 ? 'em analise' : 'ativo'
    }));

    const transactions = this.buildTransactions(cartsResponse, productsResponse);
    const cashflow: FinancePoint[] = [
      { label: 'Jan', value: 42100 },
      { label: 'Fev', value: 48600 },
      { label: 'Mar', value: 45200 },
      { label: 'Abr', value: 53750 },
      { label: 'Mai', value: 58420 },
      { label: 'Jun', value: 61290 }
    ];

    const expensesByCategory: FinancePoint[] = [
      { label: 'Cartões', value: 8240 },
      { label: 'Serviços', value: 2910 },
      { label: 'Transferências', value: 12500 },
      { label: 'Investimentos', value: 15200 }
    ];

    return { accounts, investments, cards, transactions, cashflow, expensesByCategory };
  }

  private buildTransactions(cartsResponse: ExternalCartsResponse, productsResponse: ExternalProductsResponse): Transaction[] {
    const now = Date.now();
    const cartTransactions = cartsResponse.carts.flatMap((cart, cartIndex) => cart.products.slice(0, 2).map((product, productIndex): Transaction => ({
      id: `trx-cart-${cart.id}-${productIndex}`,
      date: new Date(now - (cartIndex + productIndex + 1) * 1000 * 60 * 60 * 12).toISOString(),
      description: product.title,
      category: 'Cartão corporativo',
      type: 'saida',
      status: 'concluido',
      amount: -Math.round(product.price * product.quantity),
      channel: 'internet banking'
    })));

    const productTransactions = productsResponse.products.slice(0, 6).map((product, index): Transaction => ({
      id: `trx-product-${product.id}`,
      date: new Date(now - (index + 4) * 1000 * 60 * 60 * 9).toISOString(),
      description: index % 2 === 0 ? 'Recebimento via TED' : product.title,
      category: index % 2 === 0 ? 'Recebimentos' : product.category,
      type: index % 2 === 0 ? 'entrada' : 'pagamento',
      status: index === 4 ? 'pendente' : 'concluido',
      amount: index % 2 === 0 ? Math.round(product.price * 850) : -Math.round(product.price * 34),
      channel: index % 2 === 0 ? 'api' : 'app'
    }));

    const openingTransaction: Transaction = {
      id: 'trx-open-001',
        date: new Date(now - 1000 * 60 * 24).toISOString(),
        description: 'Aplicação CDB Liquidez Diária',
        category: 'Investimentos',
        type: 'investimento',
        status: 'concluido',
        amount: -15000,
      channel: 'internet banking'
    };

    return [openingTransaction, ...cartTransactions, ...productTransactions].slice(0, 16);
  }

  private fallbackOverview(): DashboardOverview {
    return {
      accounts: [
        { id: 'acc-corrente', label: 'Conta corrente', agency: '0001', number: '48291-7', balance: 84720.35, currency: 'BRL' },
        { id: 'acc-salario', label: 'Conta salário', agency: '0001', number: '67210-3', balance: 12650.9, currency: 'BRL' }
      ],
      investments: [
        { product: 'CDB Liquidez Diária', value: 42000, profitability: 4.8, risk: 'baixo' },
        { product: 'Fundo DI Conservador', value: 28500, profitability: 3.9, risk: 'baixo' },
        { product: 'Tesouro Selic', value: 33800, profitability: 4.2, risk: 'medio' }
      ],
      cards: [
        { id: 'card-001', holder: 'User', brand: 'Visa', finalDigits: '4219', limit: 18000, used: 6420, dueDay: 12, status: 'ativo' }
      ],
      transactions: [
        { id: 'trx-001', date: new Date().toISOString(), description: 'Recebimento via TED', category: 'Recebimentos', type: 'entrada', status: 'concluido', amount: 12500, channel: 'api' },
        { id: 'trx-002', date: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), description: 'Pagamento fornecedor', category: 'Serviços', type: 'pagamento', status: 'concluido', amount: -1840, channel: 'app' }
      ],
      cashflow: [
        { label: 'Jan', value: 42100 },
        { label: 'Fev', value: 48600 },
        { label: 'Mar', value: 45200 },
        { label: 'Abr', value: 53750 },
        { label: 'Mai', value: 58420 },
        { label: 'Jun', value: 61290 }
      ],
      expensesByCategory: [
        { label: 'Cartões', value: 8240 },
        { label: 'Serviços', value: 2910 },
        { label: 'Transferências', value: 12500 },
        { label: 'Investimentos', value: 15200 }
      ]
    };
  }
}

export type TransactionType = 'entrada' | 'saida' | 'transferencia' | 'pagamento' | 'investimento';
export type TransactionStatus = 'concluido' | 'pendente' | 'recusado' | 'agendado';

export interface AccountSummary {
  id: string;
  label: string;
  agency: string;
  number: string;
  balance: number;
  currency: 'BRL';
}

export interface InvestmentSummary {
  product: string;
  value: number;
  profitability: number;
  risk: 'baixo' | 'medio' | 'alto';
}

export interface CardSummary {
  id: string;
  holder: string;
  brand: string;
  finalDigits: string;
  limit: number;
  used: number;
  dueDay: number;
  status: 'ativo' | 'bloqueado' | 'em analise';
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  channel: 'app' | 'internet banking' | 'agencia' | 'api';
}

export interface FinancePoint {
  label: string;
  value: number;
}

export interface DashboardOverview {
  accounts: AccountSummary[];
  investments: InvestmentSummary[];
  cards: CardSummary[];
  transactions: Transaction[];
  cashflow: FinancePoint[];
  expensesByCategory: FinancePoint[];
}

export interface AuditEntry {
  id: string;
  date: string;
  actor: string;
  role: string;
  action: string;
  area: string;
  ip: string;
  status: 'sucesso' | 'alerta' | 'erro';
}

export interface ScheduledPayment {
  id: string;
  barCode: string;
  beneficiary: string;
  amount: number;
  date: string;
  status: 'agendado' | 'processando' | 'concluido';
}

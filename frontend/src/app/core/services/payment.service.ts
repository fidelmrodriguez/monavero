import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { MONAVERO_API_URL } from '../config/monavero-api';
import { ApiReadinessService } from './api-readiness.service';
import { maskedAccount, testLog } from '../utils/test-diagnostics';

export interface PaymentRequest {
  originAccountId: string;
  paymentType: 'BOLETO' | 'CONVENIO';
  beneficiary: string;
  reference: string;
  amount: number;
  description: string;
  scheduledFor: string | null;
  idempotencyKey: string;
}

export interface PaymentItem {
  id: string;
  originAccountId: string;
  paymentType: PaymentRequest['paymentType'];
  beneficiary: string;
  reference: string;
  amount: number;
  description: string;
  scheduledFor: string | null;
  createdAt: string;
  processedAt: string | null;
  status: 'agendado' | 'concluido' | 'cancelado' | 'recusado';
  failureReason: string | null;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly readiness = inject(ApiReadinessService);
  private readonly url = `${MONAVERO_API_URL}/api/v1/banking/payments`;

  list(): Observable<PaymentItem[]> {
    return this.readiness.recover(this.http.get<PaymentItem[]>(this.url)).pipe(
      tap(items => {
        testLog('8', 'Lista de pagamentos recebida da API', {
          total: items.length,
          agendados: items.filter(i => i.status === 'agendado').length,
          concluidos: items.filter(i => i.status === 'concluido').length,
          cancelados: items.filter(i => i.status === 'cancelado').length,
          recusados: items.filter(i => i.status === 'recusado').length
        });
        for (const item of items.slice(0, 10)) {
          testLog('8', 'Estado do pagamento na API', {
            referencia: item.id.slice(0, 8), status: item.status,
            valor: item.amount, tipo: item.paymentType,
            origem: maskedAccount(item.originAccountId),
            processado: item.status === 'concluido' && Boolean(item.processedAt)
          });
        }
      })
    );
  }

  create(request: PaymentRequest): Observable<PaymentItem> {
    return this.readiness.recover(this.http.post<PaymentItem>(this.url, request)).pipe(
      tap(item => testLog('8', 'Pagamento confirmado pela API', {
        referencia: item.id?.slice(0, 8) ?? 'ausente',
        status: item.status, valor: item.amount,
        agendado: Boolean(item.scheduledFor),
        debitoConfirmado: item.status === 'concluido' && Boolean(item.processedAt)
      }))
    );
  }

  cancel(id: string): Observable<PaymentItem> {
    return this.readiness.recover(this.http.delete<PaymentItem>(`${this.url}/${encodeURIComponent(id)}`)).pipe(
      tap(item => testLog('8', 'Cancelamento de pagamento confirmado pela API', {
        referencia: item.id?.slice(0, 8) ?? 'ausente',
        status: item.status, cancelado: item.status === 'cancelado'
      }))
    );
  }
}

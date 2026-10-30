import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { MONAVERO_API_URL } from '../config/monavero-api';
import { ApiReadinessService } from './api-readiness.service';
import { maskedAccount, testLog } from '../utils/test-diagnostics';

export interface ScheduledTransferRequest {
  originAccountId: string;
  destinationAgency: string;
  destinationAccountNumber: string;
  amount: number;
  description: string;
  scheduledFor: string;
  idempotencyKey: string;
}

export interface ScheduledTransfer {
  id: string;
  originAccountId: string;
  destinationAgency: string;
  destinationAccountNumber: string;
  amount: number;
  description: string;
  scheduledFor: string;
  createdAt: string;
  status: 'agendado' | 'concluido' | 'cancelado' | 'recusado';
  executedAt: string | null;
  transferId: string | null;
  failureReason: string | null;
}

@Injectable({ providedIn: 'root' })
export class ScheduledTransferService {
  private readonly http = inject(HttpClient);
  private readonly readiness = inject(ApiReadinessService);
  private readonly url = `${MONAVERO_API_URL}/api/v1/banking/scheduled-transfers`;

  list(): Observable<ScheduledTransfer[]> {
    return this.readiness.recover(this.http.get<ScheduledTransfer[]>(this.url)).pipe(
      tap(items => {
        testLog('7', 'Lista de agendamentos recebida da API', {
          total: items.length,
          agendados: items.filter(item => item.status === 'agendado').length,
          concluidos: items.filter(item => item.status === 'concluido').length,
          cancelados: items.filter(item => item.status === 'cancelado').length,
          recusados: items.filter(item => item.status === 'recusado').length
        });
        // A Blitz executa no servidor. Após o vencimento, "Atualizar" ou F5
        // consulta o estado persistido e registra aqui a confirmação.
        for (const item of items.slice(0, 10)) {
          testLog('7', 'Estado do agendamento na API', {
            referencia: item.id.slice(0, 8),
            status: item.status,
            valor: item.amount,
            destino: maskedAccount(item.destinationAccountNumber),
            previstoPara: item.scheduledFor,
            executado: item.status === 'concluido' && Boolean(item.transferId),
            temComprovante: Boolean(item.transferId)
          });
        }
      })
    );
  }

  create(request: ScheduledTransferRequest): Observable<ScheduledTransfer> {
    return this.readiness.recover(this.http.post<ScheduledTransfer>(this.url, request)).pipe(
      tap(item => testLog('7', 'Agendamento confirmado pela API', {
        referencia: item.id?.slice(0, 8) ?? 'ausente',
        status: item.status,
        valor: item.amount,
        previstoPara: item.scheduledFor,
        debitoAindaPendente: item.status === 'agendado' && !item.transferId
      }))
    );
  }

  cancel(id: string): Observable<ScheduledTransfer> {
    return this.readiness.recover(this.http.delete<ScheduledTransfer>(`${this.url}/${encodeURIComponent(id)}`)).pipe(
      tap(item => testLog('7', 'Cancelamento confirmado pela API', {
        referencia: item.id?.slice(0, 8) ?? 'ausente',
        status: item.status,
        cancelado: item.status === 'cancelado',
        temComprovante: Boolean(item.transferId)
      }))
    );
  }
}

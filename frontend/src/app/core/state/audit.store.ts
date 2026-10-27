import { Injectable, signal } from '@angular/core';
import { AuditEntry } from '../models/banking.models';
import { uid } from '../utils/formatters';

@Injectable({ providedIn: 'root' })
export class AuditStore {
  private readonly entriesState = signal<AuditEntry[]>([
    {
      id: 'aud-001',
      date: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      actor: 'User',
      role: 'cliente',
      action: 'Consulta de dashboard',
      area: 'Dashboard',
      ip: '192.168.0.21',
      status: 'sucesso'
    },
    {
      id: 'aud-002',
      date: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      actor: 'User',
      role: 'gerente',
      action: 'Exportação de extrato bloqueada por permissão',
      area: 'Extrato',
      ip: '192.168.0.21',
      status: 'alerta'
    }
  ]);

  readonly entries = this.entriesState.asReadonly();

  register(action: string, area: string, status: AuditEntry['status'] = 'sucesso', role = 'cliente'): void {
    const entry: AuditEntry = {
      id: uid('aud'),
      date: new Date().toISOString(),
      actor: 'User',
      role,
      action,
      area,
      ip: '192.168.0.21',
      status
    };

    this.entriesState.update((entries) => [entry, ...entries].slice(0, 80));
  }
}

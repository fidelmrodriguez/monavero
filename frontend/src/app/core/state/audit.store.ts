import { Injectable, signal } from '@angular/core';
import { AuditEntry } from '../models/banking.models';
import { uid } from '../utils/formatters';

@Injectable({ providedIn: 'root' })
export class AuditStore {
  private readonly entriesState = signal<AuditEntry[]>([]);

  readonly entries = this.entriesState.asReadonly();

  register(action: string, area: string, status: AuditEntry['status'] = 'sucesso', role = 'cliente'): void {
    const entry: AuditEntry = {
      id: uid('aud'),
      date: new Date().toISOString(),
      actor: 'Sessão atual',
      role,
      action,
      area,
      ip: '—',
      status
    };

    this.entriesState.update((entries) => [entry, ...entries].slice(0, 80));
  }
}

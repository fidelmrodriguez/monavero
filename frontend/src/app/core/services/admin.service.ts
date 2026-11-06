import { tap } from 'rxjs';
import { testLog } from '../utils/test-diagnostics';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MONAVERO_API_URL } from '../config/monavero-api';
import { ApiReadinessService } from './api-readiness.service';

export type AccessRole = 'CLIENT' | 'MANAGER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'BLOCKED';
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AccessRole;
  status: UserStatus;
  demo: boolean;
  version: number;
}
export interface AdminChange {
  role: AccessRole;
  status: UserStatus;
  version: number;
  reason: string;
}
export interface AuditEvent {
  id: string;
  actor: string;
  target: string;
  action: string;
  oldRole: AccessRole;
  newRole: AccessRole;
  oldStatus: UserStatus;
  newStatus: UserStatus;
  reason: string;
  occurredAt: string;
}
export interface AdminAccount {
  id: string;
  number: string;
  branch: string;
  owner: string;
  status: string;
  balance: number;
}
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly readiness = inject(ApiReadinessService);
  private readonly url = `${MONAVERO_API_URL}/api/v1`;

  accounts(page: number) {
    return this.readiness.recover(this.http.get<AdminAccount[]>(`${this.url}/admin/accounts`, { params: { page } }));
  }
  users(page: number) {
    return this.readiness.recover(this.http.get<AdminUser[]>(`${this.url}/admin/users`, { params: { page } })).pipe(
      tap(users => testLog('9', 'Usuários recebidos da API', { pagina: page + 1, total: users.length }))
    );
  }
  update(id: string, change: AdminChange) {
    return this.http.patch<AdminUser>(`${this.url}/admin/users/${encodeURIComponent(id)}`, change).pipe(
      tap(user => testLog('9', 'Alteração administrativa confirmada pela API', {
        referencia: user.id.slice(0, 8), perfil: user.role, status: user.status, versao: user.version
      }))
    );
  }
  events(page: number) {
    return this.readiness.recover(this.http.get<AuditEvent[]>(`${this.url}/audit/events`, { params: { page } })).pipe(
      tap(events => testLog('9', 'Auditoria recebida da API', { pagina: page + 1, total: events.length }))
    );
  }
}

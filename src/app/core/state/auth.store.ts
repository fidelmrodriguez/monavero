import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, of, tap } from 'rxjs';
import { AuthApiService } from '../services/auth-api.service';
import { AuthSession, UserRole } from '../models/auth.models';
import { NotificationStore } from './notification.store';
import { AuditStore } from './audit.store';

const STORAGE_KEY = 'monavero-session';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly authApi = inject(AuthApiService);
  private readonly notificationStore = inject(NotificationStore);
  private readonly auditStore = inject(AuditStore);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly sessionState = signal<AuthSession | null>(this.restoreSession());
  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.sessionState()?.accessToken));
  readonly role = computed<UserRole>(() => this.sessionState()?.role ?? 'cliente');
  readonly displayName = computed(() => this.sessionState()?.displayName ?? 'User');
  readonly isLoading = signal(false);

  login(username: string, password: string, role: UserRole = 'cliente') {
    this.isLoading.set(true);

    return this.authApi.login(username, password).pipe(
      map((response): AuthSession => ({
        id: response.id,
        username: response.username,
        accessToken: response.accessToken ?? response.token ?? '',
        refreshToken: response.refreshToken,
        role,
        displayName: 'User'
      })),
      tap((session) => {
        this.setSession(session);
        this.auditStore.register('Login realizado', 'Autenticação', 'sucesso', session.role);
        this.notificationStore.add({
          title: 'Acesso autorizado',
          message: 'Sessão de demonstração iniciada.',
          type: 'success'
        });
      }),
      catchError(() => {
        this.notificationStore.add({
          title: 'Não foi possível entrar',
          message: 'Confira usuário e senha informados.',
          type: 'danger'
        });
        return of(null);
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  updateRole(role: UserRole): void {
    const session = this.sessionState();
    if (!session) {
      return;
    }

    this.setSession({ ...session, role });
    this.auditStore.register(`Perfil de acesso alterado para ${role}`, 'Configurações', 'alerta', role);
    this.notificationStore.add({
      title: 'Perfil atualizado',
      message: `Nível de acesso definido como ${role}.`,
      type: 'success'
    });
  }

  logout(): void {
    this.auditStore.register('Logout realizado', 'Autenticação', 'sucesso', this.role());
    this.sessionState.set(null);
    if (this.isBrowser) {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.router.navigateByUrl('/login');
  }

  private setSession(session: AuthSession): void {
    this.sessionState.set(session);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }

  private restoreSession(): AuthSession | null {
    if (!this.isBrowser) {
      return null;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as AuthSession;
      return parsed.accessToken ? parsed : null;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }
}

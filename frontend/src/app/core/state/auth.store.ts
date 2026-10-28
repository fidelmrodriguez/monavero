import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, tap } from 'rxjs';
import { AuthApiService } from '../services/auth-api.service';
import { AuthResponse, AuthSession, UserRole, toRole } from '../models/auth.models';
import { NotificationStore } from './notification.store';
import { AuditStore } from './audit.store';

const STORAGE_KEY = 'monavero-auth-v2';
const OLD_KEY = 'monavero-session';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(AuthApiService);
  private readonly notifications = inject(NotificationStore);
  private readonly audit = inject(AuditStore);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly sessionState = signal<AuthSession | null>(this.restoreSession());
  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.sessionState()?.accessToken));
  readonly role = computed<UserRole>(() => this.sessionState()?.role ?? 'cliente');
  readonly displayName = computed(() => this.sessionState()?.displayName ?? 'User');
  readonly isDemo = computed(() => Boolean(this.sessionState()?.user.demo));
  readonly isLoading = signal(false);

  login(email: string, password: string): Observable<AuthSession | null> {
    return this.handle(this.api.login(email, password));
  }

  register(name: string, email: string, password: string): Observable<AuthSession | null> {
    return this.handle(this.api.register(name, email, password));
  }

  demo(): Observable<AuthSession | null> {
    return this.handle(this.api.demo());
  }

  /** Valida a sessão salva no servidor, incluindo expiração, revogação e papel atual. */
  validateSession(): Observable<boolean> {
    const session = this.sessionState();
    if (!session || Date.parse(session.expiresAt) <= Date.now()) {
      this.clearSession();
      return of(false);
    }
    return this.api.me().pipe(
      map(profile => {
        this.setSession({ ...session, user: profile, role: toRole(profile.role), displayName: profile.name });
        return true;
      }),
      catchError(() => {
        this.clearSession();
        return of(false);
      })
    );
  }

  logout(): void {
    const current = this.sessionState();
    this.audit.register('Logout realizado', 'Autenticação', 'sucesso', this.role());
    this.clearSession();
    void this.router.navigateByUrl('/login');
    if (current) {
      this.api.logout(current.accessToken).pipe(catchError(() => of(void 0))).subscribe();
    }
  }

  private handle(request: Observable<AuthResponse>): Observable<AuthSession | null> {
    this.isLoading.set(true);
    return request.pipe(
      map(response => ({ ...response, role: toRole(response.user.role), displayName: response.user.name })),
      tap(session => {
        this.setSession(session);
        this.audit.register('Login realizado', 'Autenticação', 'sucesso', session.role);
        this.notifications.add({
          title: 'Acesso autorizado',
          message: session.user.demo ? 'Ambiente demonstrativo iniciado.' : 'Conta autenticada.',
          type: 'success'
        });
      }),
      catchError(() => {
        this.notifications.add({
          title: 'Não foi possível autenticar',
          message: 'Confira os dados informados e tente novamente.',
          type: 'danger'
        });
        return of(null);
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  private clearSession(): void {
    this.sessionState.set(null);
    if (this.isBrowser) sessionStorage.removeItem(STORAGE_KEY);
  }

  private setSession(session: AuthSession): void {
    this.sessionState.set(session);
    if (this.isBrowser) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  private restoreSession(): AuthSession | null {
    if (!this.isBrowser) return null;
    // Nunca reutilizar o token da antiga API DummyJSON.
    localStorage.removeItem(OLD_KEY);
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const value = JSON.parse(raw) as AuthSession;
      if (typeof value.accessToken === 'string' && value.user?.id &&
          Number.isFinite(Date.parse(value.expiresAt)) && Date.parse(value.expiresAt) > Date.now()) {
        return value;
      }
    } catch { /* Sessão anterior inválida. */ }
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

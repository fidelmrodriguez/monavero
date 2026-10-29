import { isPlatformBrowser } from '@angular/common';
import { Injectable, NgZone, OnDestroy, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, tap } from 'rxjs';
import { AuthApiService } from '../services/auth-api.service';
import { ApiReadinessService } from '../services/api-readiness.service';
import { AuthResponse, AuthSession, UserRole, toRole } from '../models/auth.models';
import { NotificationStore } from './notification.store';
import { AuditStore } from './audit.store';

const STORAGE_KEY = 'monavero-auth-v2';
const OLD_KEY = 'monavero-session';
const TABS_CHANNEL = 'monavero-auth-tabs-v1';
const TAB_WAIT_MS = 500;

type TabAuthMessage =
  | { type: 'SESSION_REQUEST' }
  | { type: 'SESSION_RESPONSE'; session: AuthSession }
  | { type: 'LOGIN'; session: AuthSession }
  | { type: 'LOGOUT'; accessToken: string };

@Injectable({ providedIn: 'root' })
export class AuthStore implements OnDestroy {
  private readonly api = inject(AuthApiService);
  private readonly readiness = inject(ApiReadinessService);
  private readonly notifications = inject(NotificationStore);
  private readonly audit = inject(AuditStore);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly sessionState = signal<AuthSession | null>(this.restoreSession());
  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.sessionState()?.accessToken));
  /** Papel real retornado pelo backend. Nunca é modificado pela seleção do demo. */
  readonly role = computed<UserRole>(() => this.sessionState()?.role ?? 'cliente');
  /** Perfil visual do portfólio. Somente sessões marcadas como demo pela API podem simulá-lo. */
  readonly viewRole = computed<UserRole>(() => {
    const session = this.sessionState();
    return session?.user.demo ? (this.safeDemoRole(session.demoViewRole) ?? this.role()) : this.role();
  });
  readonly displayName = computed(() => this.sessionState()?.displayName ?? 'User');
  readonly isDemo = computed(() => Boolean(this.sessionState()?.user.demo));
  readonly isLoading = signal(false);

  private channel: BroadcastChannel | null = null;
  private handshake: Promise<void> = Promise.resolve();
  private resolveHandshake: (() => void) | null = null;
  private handshakeTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    this.connectTabs();
  }

  /** Aguarda brevemente uma sessão de outra aba antes da decisão inicial do Router. */
  waitForTabSession(): Promise<void> {
    return this.handshake;
  }

  ngOnDestroy(): void {
    this.finishHandshake();
    this.channel?.close();
    this.channel = null;
  }

  login(email: string, password: string): Observable<AuthSession | null> {
    return this.handle(this.api.login(email, password));
  }

  register(name: string, email: string, password: string): Observable<AuthSession | null> {
    return this.handle(this.api.register(name, email, password), undefined, false);
  }

  demo(viewRole: UserRole = 'cliente'): Observable<AuthSession | null> {
    return this.handle(this.api.demo(), viewRole);
  }

  /** Valida a sessão salva no servidor, incluindo expiração, revogação e papel atual. */
  validateSession(): Observable<boolean> {
    const session = this.sessionState();
    if (!session || Date.parse(session.expiresAt) <= Date.now()) {
      this.clearSession();
      return of(false);
    }
    return this.readiness.recover(this.api.me()).pipe(
      map(profile => {
        // Um logout em outra aba pode ocorrer enquanto /me ainda está em voo.
        if (this.sessionState()?.accessToken !== session.accessToken) return false;
        this.setSession({
          ...session, user: profile, role: toRole(profile.role), displayName: profile.name,
          demoViewRole: profile.demo && session.user.demo ? this.safeDemoRole(session.demoViewRole) : undefined
        }, false);
        return true;
      }),
      catchError(() => {
        if (this.sessionState()?.accessToken === session.accessToken) this.clearSession();
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

  private handle(request: Observable<AuthResponse>, demoViewRole?: UserRole, retryTransient = true): Observable<AuthSession | null> {
    this.isLoading.set(true);
    return (retryTransient ? this.readiness.recover(request) : request).pipe(
      map(response => ({
        ...response, role: toRole(response.user.role), displayName: response.user.name,
        demoViewRole: response.user.demo ? this.safeDemoRole(demoViewRole) : undefined
      })),
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

  private clearSession(notifyTabs = true): void {
    const previous = this.sessionState();
    this.sessionState.set(null);
    this.finishHandshake();
    if (this.isBrowser) sessionStorage.removeItem(STORAGE_KEY);
    // Não propagar logout de uma sessão antiga para uma aba com outro login.
    if (notifyTabs && previous) this.channel?.postMessage({ type: 'LOGOUT', accessToken: previous.accessToken } satisfies TabAuthMessage);
  }

  private setSession(session: AuthSession, notifyTabs = true): void {
    this.sessionState.set(session);
    this.finishHandshake();
    if (this.isBrowser) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    if (notifyTabs) this.channel?.postMessage({ type: 'LOGIN', session } satisfies TabAuthMessage);
  }

  private connectTabs(): void {
    if (!this.isBrowser || typeof BroadcastChannel === 'undefined') return;
    try {
      this.channel = new BroadcastChannel(TABS_CHANNEL);
      this.channel.onmessage = event => this.zone.run(() => this.receiveTabMessage(event.data as TabAuthMessage));
      if (!this.sessionState()) {
        this.handshake = new Promise<void>(resolve => { this.resolveHandshake = resolve; });
        this.handshakeTimeout = setTimeout(() => this.finishHandshake(), TAB_WAIT_MS);
        this.channel.postMessage({ type: 'SESSION_REQUEST' } satisfies TabAuthMessage);
      }
    } catch {
      this.finishHandshake();
      this.channel?.close();
      this.channel = null;
    }
  }

  private receiveTabMessage(message: TabAuthMessage): void {
    if (!message || typeof message !== 'object') return;
    if (message.type === 'SESSION_REQUEST') {
      const current = this.sessionState();
      if (current && this.isValidSession(current)) {
        this.channel?.postMessage({ type: 'SESSION_RESPONSE', session: current } satisfies TabAuthMessage);
      }
      return;
    }

    if (message.type === 'LOGOUT') {
      if (this.sessionState()?.accessToken !== message.accessToken) return;
      this.clearSession(false);
      this.finishHandshake();
      if (this.router.url.startsWith('/app')) void this.router.navigateByUrl('/login');
      return;
    }

    if (message.type !== 'SESSION_RESPONSE' && message.type !== 'LOGIN') return;
    if (!this.isValidSession(message.session)) return;
    if (message.type === 'SESSION_RESPONSE' && this.sessionState()) return;

    const wasWaiting = this.resolveHandshake !== null;
    const session: AuthSession = {
      ...message.session,
      role: toRole(message.session.user.role),
      displayName: message.session.user.name,
      demoViewRole: message.session.user.demo ? this.safeDemoRole(message.session.demoViewRole) : undefined
    };
    this.setSession(session, false);
    // Login em outra aba atualiza também uma aba que estava na tela de login.
    if (message.type === 'LOGIN' && this.router.url.startsWith('/login')) {
      void this.router.navigateByUrl('/app/dashboard');
    }
    // Uma aba em segundo plano pode responder depois do prazo de 500 ms.
    if (message.type === 'SESSION_RESPONSE' && !wasWaiting && this.router.url.startsWith('/login')) {
      this.validateSession().subscribe(valid => {
        if (valid && this.router.url.startsWith('/login')) {
          void this.router.navigateByUrl('/app/dashboard');
        }
      });
    }
  }

  private finishHandshake(): void {
    if (this.handshakeTimeout !== undefined) clearTimeout(this.handshakeTimeout);
    this.handshakeTimeout = undefined;
    this.resolveHandshake?.();
    this.resolveHandshake = null;
  }

  private isValidSession(value: unknown): value is AuthSession {
    if (!value || typeof value !== 'object') return false;
    const session = value as Partial<AuthSession>;
    return typeof session.accessToken === 'string' && session.accessToken.length > 0 &&
      typeof session.user?.id === 'string' && typeof session.user?.name === 'string' &&
      (session.user.role === 'CLIENT' || session.user.role === 'MANAGER' || session.user.role === 'ADMIN') &&
      typeof session.expiresAt === 'string' && Date.parse(session.expiresAt) > Date.now();
  }

  private safeDemoRole(role: unknown): UserRole | undefined {
    return role === 'cliente' || role === 'gerente' || role === 'admin' ? role : undefined;
  }

  private restoreSession(): AuthSession | null {
    if (!this.isBrowser) return null;
    // Nunca reutilizar o token da antiga API DummyJSON.
    localStorage.removeItem(OLD_KEY);
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const value = JSON.parse(raw) as unknown;
      if (this.isValidSession(value)) {
        return {
          ...value,
          role: toRole(value.user.role),
          displayName: value.user.name,
          demoViewRole: value.user.demo ? this.safeDemoRole(value.demoViewRole) : undefined
        };
      }
    } catch { /* Sessão anterior inválida. */ }
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { MONAVERO_API_URL } from '../config/monavero-api';

const RETRY_MS = 5_000;
const TIMEOUT_MS = 12_000;

/**
 * Aguarda a API Java despertar na Blitz antes de fazer login, cadastro ou /me.
 * /api/v1/system/info já tem CORS para o Netlify; /actuator/health não tem.
 * Nunca aceita HTML de "waking up" como confirmação de disponibilidade.
 */
@Injectable({ providedIn: 'root' })
export class ApiReadinessService implements OnDestroy {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly readyState = signal(false);
  readonly ready = this.readyState.asReadonly();
  readonly elapsedSeconds = signal(0);
  readonly elapsedLabel = computed(() => {
    const seconds = this.elapsedSeconds();
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  });

  private started = false;
  private destroyed = false;
  private startedAt = 0;
  private intervalId?: ReturnType<typeof setInterval>;
  private retryId?: ReturnType<typeof setTimeout>;
  private controller?: AbortController;
  private complete!: () => void;
  private readonly readyPromise = new Promise<void>(resolve => { this.complete = resolve; });

  start(): void {
    if (!this.browser || this.started || this.destroyed) return;
    this.started = true;
    this.startedAt = Date.now();
    this.intervalId = setInterval(() => {
      this.elapsedSeconds.set(Math.floor((Date.now() - this.startedAt) / 1000));
    }, 1_000);
    void this.check();
  }

  /** Não bloqueia renderização SSR; no navegador, aguarda a API real responder. */
  waitUntilReady(): Promise<void> {
    if (!this.browser) return Promise.resolve();
    this.start();
    return this.readyPromise;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopTimers();
    this.controller?.abort();
    this.controller = undefined;
  }

  private async check(): Promise<void> {
    if (this.destroyed || this.readyState()) return;
    const controller = new AbortController();
    this.controller = controller;
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let available = false;

    try {
      // Sem token e sem interceptor: um token expirado não bloqueia o despertar.
      const response = await fetch(`${MONAVERO_API_URL}/api/v1/system/info`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal
      });
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
      if (response.ok && contentType.includes('json')) {
        const body: unknown = await response.json();
        available = body !== null && typeof body === 'object' &&
          'application' in body && body.application === 'monavero-api' &&
          'status' in body && body.status === 'available';
      }
    } catch {
      // Timeout, indisponibilidade e cold start são esperados no plano gratuito.
    } finally {
      clearTimeout(timeoutId);
      if (this.controller === controller) this.controller = undefined;
    }

    if (this.destroyed) return;
    if (available) {
      this.readyState.set(true);
      this.stopTimers();
      this.complete();
      return;
    }
    // Uma tentativa por vez; o contador não interrompe novas consultas.
    this.retryId = setTimeout(() => { void this.check(); }, RETRY_MS);
  }

  private stopTimers(): void {
    if (this.intervalId !== undefined) clearInterval(this.intervalId);
    if (this.retryId !== undefined) clearTimeout(this.retryId);
    this.intervalId = undefined;
    this.retryId = undefined;
  }
}

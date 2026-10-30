import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { from, Observable, retry, throwError } from 'rxjs';
import { MONAVERO_API_URL } from '../config/monavero-api';

const RETRY_MS = 5_000;
const TIMEOUT_MS = 12_000;
const READINESS_PATH = '/api/monavero-readiness';
const DIRECT_INFO_PATH = `${MONAVERO_API_URL}/api/v1/system/info`;

/**
 * Aguarda a API Java despertar na Blitz antes de fazer login, cadastro ou /me.
 * Verifica dois endpoints independentes: o proxy /actuator/health do Netlify
 * e /api/v1/system/info diretamente na API Java (CORS liberado para o Netlify).
 * Basta um responder com o JSON esperado para liberar o app. Isso evita que
 * um erro de proxy deixe o loading travado mesmo com o Spring Boot online.
 * Nenhuma resposta HTML da Blitz ou do SPA pode ser interpretada como sucesso.
 */
@Injectable({ providedIn: 'root' })
export class ApiReadinessService implements OnDestroy {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly readyState = signal(false);
  readonly ready = this.readyState.asReadonly();
  /** Mantém compatibilidade com a ação opcional de abrir a Blitz em outra aba. */
  readonly wakeUrl = `${MONAVERO_API_URL}/actuator/health`;
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
  private readyPromise = new Promise<void>(resolve => { this.complete = resolve; });

  /** Revalida a API quando a Blitz volta a dormir depois da primeira abertura do site. */
  markUnavailable(): void {
    if (!this.browser || this.destroyed || !this.readyState()) return;
    this.readyState.set(false);
    this.readyPromise = new Promise<void>(resolve => { this.complete = resolve; });
    this.started = false;
    this.start();
  }

  /** Repete requisições apenas após erro de rede/Blitz e retorno real da API. 401 não é repetido. */
  recover<T>(request: Observable<T>): Observable<T> {
    return request.pipe(retry({
      count: 2,
      delay: error => {
        if (!(error instanceof HttpErrorResponse) || ![0, 502, 503, 504].includes(error.status)) {
          return throwError(() => error);
        }
        this.markUnavailable();
        return from(this.waitUntilReady());
      }
    }));
  }

  start(): void {
    if (!this.browser || this.started || this.destroyed) return;
    this.started = true;
    this.elapsedSeconds.set(0);
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

  /** Confirma um endpoint próprio do Monavero, sem depender de conteúdo HTML do proxy. */
  private async probe(url: string, source: 'proxy' | 'api', signal: AbortSignal): Promise<void> {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      credentials: 'omit',
      signal
    });
    if (!response.ok) throw new Error('API ainda indisponível');

    // Se a Blitz/Netlify devolver HTML, response.json() rejeita. Exigimos os
    // campos esperados; um 200 da página inicial do Angular não é prontidão.
    const body: unknown = await response.json();
    if (body === null || typeof body !== 'object') throw new Error('Resposta inválida');
    const expected = source === 'proxy'
      ? 'status' in body && body.status === 'UP'
      : 'application' in body && body.application === 'monavero-api' &&
        'status' in body && body.status === 'available';
    if (!expected) throw new Error('Endpoint ainda não confirmou prontidão');
  }

  private async check(): Promise<void> {
    if (this.destroyed || this.readyState()) return;
    const controller = new AbortController();
    this.controller = controller;
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let available = false;

    try {
      // Executa ambas as verificações: a primeira resposta válida libera o app,
      // sem precisar esperar o proxy terminar caso a API direta esteja online.
      await Promise.any([
        this.probe(READINESS_PATH, 'proxy', controller.signal),
        this.probe(DIRECT_INFO_PATH, 'api', controller.signal)
      ]);
      available = true;
    } catch {
      // As duas falharam ou esgotaram o tempo: repetir após RETRY_MS.
    } finally {
      clearTimeout(timeoutId);
      controller.abort(); // Interrompe apenas a tentativa paralela restante.
      if (this.controller === controller) this.controller = undefined;
    }

    if (this.destroyed) return;
    if (available) {
      this.readyState.set(true);
      this.stopTimers();
      this.complete();
      return;
    }
    this.retryId = setTimeout(() => { void this.check(); }, RETRY_MS);
  }

  private stopTimers(): void {
    if (this.intervalId !== undefined) clearInterval(this.intervalId);
    if (this.retryId !== undefined) clearTimeout(this.retryId);
    this.intervalId = undefined;
    this.retryId = undefined;
  }
}

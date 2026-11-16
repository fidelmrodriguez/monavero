import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { MONAVERO_API_URL } from '../config/monavero-api';
import { uid } from '../utils/formatters';

export type ToastType = 'success' | 'warning' | 'danger' | 'info';

export interface AppToast {
  id: string;
  title: string;
  message: string;
  type: ToastType;
}

export interface BankNotification {
  id: string;
  date: string;
  title: string;
  description: string;
  read: boolean;
  type: ToastType;
}

/** Toasts locais; notificações bancárias são sempre recuperadas da API por titular. */
@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly url = `${MONAVERO_API_URL}/api/v1/notifications`;
  private readonly toastsState = signal<AppToast[]>([]);
  private readonly notificationsState = signal<BankNotification[]>([]);
  private ownerId: string | null = null;
  private revision = 0;
  readonly toasts = this.toastsState.asReadonly();
  readonly notifications = this.notificationsState.asReadonly();
  readonly unreadCount = computed(() => this.notificationsState().filter(item => !item.read).length);
  readonly loading = signal(false);
  readonly error = signal(false);

  add(toast: Omit<AppToast, 'id'>): void {
    const id = uid('toast');
    this.toastsState.update(items => [...items, { ...toast, id }]);
    if (isPlatformBrowser(this.platformId)) {
      window.setTimeout(() => {
        this.toastsState.update(items => items.filter(item => item.id !== id));
      }, 4600);
    }
  }

  /** Invocado pelo shell na abertura da sessão. Nunca mistura itens entre titulares. */
  sync(userId: string): void {
    if (this.ownerId !== userId) {
      this.ownerId = userId;
      this.revision++;
      this.notificationsState.set([]);
    }
    this.refresh();
  }

  refresh(): void {
    if (!this.ownerId) return;
    const owner = this.ownerId;
    const revision = ++this.revision;
    this.loading.set(true);
    this.error.set(false);
    this.http.get<BankNotification[]>(this.url).subscribe({
      next: items => {
        if (this.ownerId !== owner || this.revision !== revision) return;
        this.notificationsState.set(items);
        this.loading.set(false);
      },
      error: () => {
        if (this.ownerId !== owner || this.revision !== revision) return;
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  markAsRead(id: string): void {
    if (!this.ownerId || !this.notificationsState().some(item => item.id === id && !item.read)) return;
    const owner = this.ownerId;
    this.http.patch<void>(`${this.url}/${id}/read`, {}).subscribe({
      next: () => {
        if (this.ownerId === owner) {
          this.notificationsState.update(items => items.map(item => item.id === id ? { ...item, read: true } : item));
        }
      },
      error: () => this.add({ title: 'Não foi possível marcar como lida', message: 'Tente novamente.', type: 'warning' })
    });
  }

  markAllAsRead(): void {
    if (!this.ownerId || this.unreadCount() === 0) return;
    const owner = this.ownerId;
    this.http.patch<void>(`${this.url}/read-all`, {}).subscribe({
      next: () => {
        if (this.ownerId === owner) {
          this.notificationsState.update(items => items.map(item => ({ ...item, read: true })));
        }
      },
      error: () => this.add({ title: 'Não foi possível atualizar os avisos', message: 'Tente novamente.', type: 'warning' })
    });
  }
}

import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
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

/** Notificações apenas de ações reais desta sessão, sem fixtures ou alertas aleatórios. */
@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toastsState = signal<AppToast[]>([]);
  private readonly notificationsState = signal<BankNotification[]>([]);
  readonly toasts = this.toastsState.asReadonly();
  readonly notifications = this.notificationsState.asReadonly();
  readonly unreadCount = computed(() => this.notificationsState().filter(item => !item.read).length);

  add(toast: Omit<AppToast, 'id'>): void {
    const id = uid('toast');
    this.toastsState.update(items => [...items, { ...toast, id }]);
    if (isPlatformBrowser(this.platformId)) {
      window.setTimeout(() => {
        this.toastsState.update(items => items.filter(item => item.id !== id));
      }, 4600);
    }
  }

  addNotification(notification: Omit<BankNotification, 'id' | 'date' | 'read'>): void {
    const item: BankNotification = {
      id: uid('not'), date: new Date().toISOString(), read: false, ...notification
    };
    this.notificationsState.update(items => [item, ...items]);
    this.add({ title: item.title, message: item.description, type: item.type });
  }

  markAsRead(id: string): void {
    this.notificationsState.update(items => items.map(item => item.id === id ? { ...item, read: true } : item));
  }

  markAllAsRead(): void {
    this.notificationsState.update(items => items.map(item => ({ ...item, read: true })));
  }
}

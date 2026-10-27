import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { interval, Subscription } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class NotificationStore implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toastsState = signal<AppToast[]>([]);
  private readonly notificationsState = signal<BankNotification[]>([
    {
      id: 'not-001',
      date: new Date().toISOString(),
      title: 'Cartão virtual (exemplo)',
      description: 'Notificação fictícia para demonstrar o comportamento da central.',
      read: false,
      type: 'success'
    },
    {
      id: 'not-002',
      date: new Date(Date.now() - 1000 * 60 * 38).toISOString(),
      title: 'Pagamento demonstrativo agendado',
      description: 'Exemplo de agendamento sem processamento bancário.',
      read: false,
      type: 'warning'
    }
  ]);
  private realtimeSub?: Subscription;

  readonly toasts = this.toastsState.asReadonly();
  readonly notifications = this.notificationsState.asReadonly();
  readonly unreadCount = computed(() => this.notificationsState().filter((item) => !item.read).length);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.realtimeSub = interval(22000).subscribe(() => this.pushRealtimeNotification());
    }
  }

  add(toast: Omit<AppToast, 'id'>): void {
    const id = uid('toast');
    this.toastsState.update((items) => [...items, { ...toast, id }]);

    if (isPlatformBrowser(this.platformId)) {
      window.setTimeout(() => {
        this.toastsState.update((items) => items.filter((item) => item.id !== id));
      }, 4600);
    }
  }

  addNotification(notification: Omit<BankNotification, 'id' | 'date' | 'read'>): void {
    const item: BankNotification = {
      id: uid('not'),
      date: new Date().toISOString(),
      read: false,
      ...notification
    };
    this.notificationsState.update((items) => [item, ...items]);
    this.add({ title: item.title, message: item.description, type: item.type });
  }

  markAsRead(id: string): void {
    this.notificationsState.update((items) => items.map((item) => item.id === id ? { ...item, read: true } : item));
  }

  markAllAsRead(): void {
    this.notificationsState.update((items) => items.map((item) => ({ ...item, read: true })));
  }

  ngOnDestroy(): void {
    this.realtimeSub?.unsubscribe();
  }

  private pushRealtimeNotification(): void {
    const messages = [
      {
        title: 'Simulação de análise antifraude',
        description: 'Alerta fictício gerado para demonstração de notificações.',
        type: 'success' as const
      },
      {
        title: 'Simulação de revisão de limite',
        description: 'Exemplo de notificação sobre limites.',
        type: 'info' as const
      },
      {
        title: 'Simulação de Pix agendado',
        description: 'Exemplo de aviso sobre acompanhamento de transferências.',
        type: 'warning' as const
      }
    ];

    const item = messages[Math.floor(Math.random() * messages.length)];
    this.addNotification(item);
  }
}

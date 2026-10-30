import { DatePipe, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/state/auth.store';
import { NotificationStore } from '../../core/state/notification.store';
import { ThemeStore } from '../../core/state/theme.store';
import { UserRole } from '../../core/models/auth.models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface NavigationItem {
  label: string;
  route: string;
  icon: string;
  roles?: UserRole[];
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly chunkRecoveryKey = 'monavero:chunk-recovery';
  protected readonly navigating = signal(false);
  protected readonly navigationFailed = signal(false);
  protected readonly authStore = inject(AuthStore);
  protected readonly notificationStore = inject(NotificationStore);
  protected readonly themeStore = inject(ThemeStore);
  protected readonly today = new Date();
  protected readonly menuOpen = signal(false);
  protected readonly notificationsOpen = signal(false);
  protected readonly userMenuOpen = signal(false);
  protected readonly recentNotifications = computed(() => this.notificationStore.notifications().slice(0, 5));

  constructor() {
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      if (event instanceof NavigationStart) {
        this.navigating.set(true);
        this.navigationFailed.set(false);
      }
      if (event instanceof NavigationEnd) {
        this.navigating.set(false);
        if (isPlatformBrowser(this.platformId)) {
          sessionStorage.removeItem(this.chunkRecoveryKey);
        }
      }
      if (event instanceof NavigationCancel) this.navigating.set(false);
      if (event instanceof NavigationError) {
        this.navigating.set(false);
        this.navigationFailed.set(true);
        const reason = String(event.error?.message ?? event.error ?? '');
        const missingChunk = /dynamically imported module|loading chunk|chunkloaderror|importing a module script|failed to fetch dynamically/i.test(reason);
        console.error('[Monavero][Navegação] Falha ao carregar página', { rota: event.url, recursoDesatualizado: missingChunk });
        // Um deploy troca o nome dos chunks lazy. Uma recarga única atualiza index.html,
        // sem loop infinito se a CDN continuar falhando.
        if (missingChunk && isPlatformBrowser(this.platformId) &&
            sessionStorage.getItem(this.chunkRecoveryKey) !== event.url) {
          sessionStorage.setItem(this.chunkRecoveryKey, event.url);
          window.location.reload();
        }
      }
    });
  }

  protected retryNavigation(): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem(this.chunkRecoveryKey);
      window.location.reload();
    }
  }

  private readonly navigation: NavigationItem[] = [
    { label: 'Dashboard', route: '/app/dashboard', icon: '📊' },
    { label: 'Extrato', route: '/app/extrato', icon: '📄' },
    { label: 'Transferências', route: '/app/transferencias', icon: '↔️' },
    { label: 'Agendamentos', route: '/app/agendamentos', icon: '🕒' },
    { label: 'Pagamentos', route: '/app/pagamentos', icon: '📅' },
    { label: 'Notificações', route: '/app/notificacoes', icon: '🔔' },
    { label: 'Auditoria', route: '/app/auditoria', icon: '🧾', roles: ['gerente', 'admin'] },
    { label: 'Administração', route: '/app/administracao', icon: '🛡️', roles: ['admin'] },
    { label: 'Perfil', route: '/app/perfil', icon: '⚙️' }
  ];

  protected readonly visibleNavigation = computed(() => {
    const role = this.authStore.viewRole();
    return this.navigation.filter((item) => !item.roles || item.roles.includes(role));
  });

  protected toggleMenu(): void {
    this.notificationsOpen.set(false);
    this.userMenuOpen.set(false);
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected toggleNotifications(): void {
    this.menuOpen.set(false);
    this.userMenuOpen.set(false);
    this.notificationsOpen.update((open) => !open);
  }

  protected closeNotifications(): void {
    this.notificationsOpen.set(false);
  }

  protected toggleUserMenu(): void {
    this.menuOpen.set(false);
    this.notificationsOpen.set(false);
    this.userMenuOpen.update((open) => !open);
  }

  protected closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected closeUserMenuFromOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;

    if (!target?.closest('.user-area')) {
      this.userMenuOpen.set(false);
    }
  }

  protected markNotificationAsRead(id: string): void {
    this.notificationStore.markAsRead(id);
  }

  protected markAllNotificationsAsRead(): void {
    this.notificationStore.markAllAsRead();
  }

  protected logout(): void {
    this.userMenuOpen.set(false);
    this.authStore.logout();
  }
}

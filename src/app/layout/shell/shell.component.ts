import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/state/auth.store';
import { NotificationStore } from '../../core/state/notification.store';
import { ThemeStore } from '../../core/state/theme.store';
import { UserRole } from '../../core/models/auth.models';

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
  protected readonly authStore = inject(AuthStore);
  protected readonly notificationStore = inject(NotificationStore);
  protected readonly themeStore = inject(ThemeStore);
  protected readonly today = new Date();
  protected readonly menuOpen = signal(false);
  protected readonly notificationsOpen = signal(false);
  protected readonly userMenuOpen = signal(false);
  protected readonly recentNotifications = computed(() => this.notificationStore.notifications().slice(0, 5));
  private readonly navigation: NavigationItem[] = [
    { label: 'Dashboard', route: '/app/dashboard', icon: '📊' },
    { label: 'Extrato', route: '/app/extrato', icon: '📄' },
    { label: 'Transferências', route: '/app/transferencias', icon: '↔️' },
    { label: 'Pagamentos', route: '/app/pagamentos', icon: '📅' },
    { label: 'Notificações', route: '/app/notificacoes', icon: '🔔' },
    { label: 'Auditoria', route: '/app/auditoria', icon: '🧾', roles: ['gerente', 'admin'] },
    { label: 'Administração', route: '/app/administracao', icon: '🛡️', roles: ['admin'] },
    { label: 'Perfil', route: '/app/perfil', icon: '⚙️' }
  ];

  protected readonly visibleNavigation = computed(() => {
    const role = this.authStore.role();
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

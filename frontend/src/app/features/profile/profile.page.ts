import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ProfileService, ProfileSession } from '../../core/services/profile.service';
import { AuthStore } from '../../core/state/auth.store';
import { NotificationStore } from '../../core/state/notification.store';
import { ThemeMode, ThemeStore } from '../../core/state/theme.store';

@Component({
  selector: 'app-profile-page',
  imports: [DatePipe, FormsModule],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePage {
  protected readonly authStore = inject(AuthStore);
  protected readonly themeStore = inject(ThemeStore);
  private readonly profileApi = inject(ProfileService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notifications = inject(NotificationStore);
  protected readonly name = signal(this.authStore.displayName());
  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly savingName = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly loadingSessions = signal(false);
  protected readonly sessions = signal<ProfileSession[]>([]);
  protected readonly busySession = signal<string | null>(null);
  protected readonly feedback = signal('');
  protected readonly error = signal('');

  constructor() { if (!this.authStore.isDemo()) this.loadSessions(); }

  protected changeTheme(theme: ThemeMode): void { this.themeStore.setMode(theme); }

  protected saveName(): void {
    const name = this.name().trim();
    if (this.authStore.isDemo() || this.savingName() || name.length < 2 || name.length > 160) return;
    this.savingName.set(true);
    this.feedback.set(''); this.error.set('');
    this.profileApi.rename(name).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: profile => {
        this.authStore.updateProfile(profile);
        this.name.set(profile.name);
        this.savingName.set(false);
        this.feedback.set('Nome atualizado com sucesso.');
        this.notifications.refresh();
      },
      error: () => { this.savingName.set(false); this.error.set('Não foi possível atualizar o nome.'); }
    });
  }

  protected savePassword(): void {
    const password = this.newPassword();
    if (this.authStore.isDemo() || this.savingPassword() || !this.currentPassword() ||
        password.length < 12 || password.length > 72) return;
    this.savingPassword.set(true);
    this.feedback.set(''); this.error.set('');
    this.profileApi.changePassword(this.currentPassword(), password)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.currentPassword.set(''); this.newPassword.set('');
          this.savingPassword.set(false);
          this.notifications.add({ title: 'Senha alterada', message: 'Entre novamente com a nova senha.', type: 'success' });
          this.authStore.logout();
        },
        error: err => {
          this.savingPassword.set(false);
          this.error.set(err.status === 422 ? 'Senha atual incorreta.' :
            err.status === 400 ? 'Use uma nova senha diferente da atual, com 12 a 72 caracteres.' :
            'Não foi possível alterar a senha.');
        }
      });
  }

  protected loadSessions(): void {
    if (this.authStore.isDemo()) return;
    this.loadingSessions.set(true);
    this.profileApi.sessions().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: sessions => { this.sessions.set(sessions); this.loadingSessions.set(false); },
      error: () => { this.loadingSessions.set(false); this.error.set('Não foi possível listar as sessões.'); }
    });
  }

  protected revokeSession(session: ProfileSession): void {
    if (session.current || this.authStore.isDemo() || this.busySession()) return;
    this.busySession.set(session.id);
    this.error.set(''); this.feedback.set('');
    this.profileApi.revokeSession(session.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.sessions.update(items => items.filter(item => item.id !== session.id));
        this.busySession.set(null);
        this.feedback.set('Outra sessão encerrada.');
        this.notifications.refresh();
      },
      error: () => { this.busySession.set(null); this.error.set('Não foi possível encerrar a sessão.'); }
    });
  }
}

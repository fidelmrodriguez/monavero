import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccessRole, AdminAccount, AdminService, AdminUser, UserStatus } from '../../core/services/admin.service';
import { AuthStore } from '../../core/state/auth.store';

@Component({
  selector: 'app-admin-page',
  imports: [FormsModule, CurrencyPipe],
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPage {
  private readonly api = inject(AdminService);
  private readonly auth = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly users = signal<AdminUser[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly page = signal(0);
  protected readonly hasNext = signal(false);
  protected readonly selected = signal<AdminUser | null>(null);
  protected role: AccessRole = 'CLIENT';
  protected status: UserStatus = 'ACTIVE';
  protected reason = '';
  protected readonly roleLabels = { CLIENT: 'Cliente', MANAGER: 'Gerente', ADMIN: 'Administrador' };
  protected readonly statusLabels = { ACTIVE: 'Ativo', BLOCKED: 'Bloqueado' };

  protected readonly accounts = signal<AdminAccount[]>([]);
  protected readonly accountsLoading = signal(false);
  protected readonly accountsError = signal(false);
  protected readonly accountsPage = signal(0);
  protected readonly accountsNext = signal(false);

  constructor() { this.load(); this.loadAccounts(); }

  protected loadAccounts(page = this.accountsPage()): void {
    if (this.accountsLoading()) return;
    this.accountsLoading.set(true);
    this.accountsError.set(false);
    this.api.accounts(page).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: accounts => {
        this.accounts.set(accounts.slice(0, 50));
        this.accountsNext.set(accounts.length > 50);
        this.accountsPage.set(page);
        this.accountsLoading.set(false);
      },
      error: () => {
        this.accounts.set([]);
        this.accountsError.set(true);
        this.accountsLoading.set(false);
      }
    });
  }

  protected editable(user: AdminUser): boolean {
    return !user.demo && user.id !== this.auth.session()?.user.id;
  }

  protected load(page = this.page()): void {
    if (this.loading() || this.saving()) return;
    this.loading.set(true);
    this.error.set('');
    this.selected.set(null);
    this.api.users(page).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: users => {
        this.page.set(page);
        this.hasNext.set(users.length > 50);
        this.users.set(users.slice(0, 50));
        this.loading.set(false);
      },
      error: () => {
        this.users.set([]);
        this.loading.set(false);
        this.error.set('Não foi possível carregar os usuários. Confira sua sessão e tente novamente.');
      }
    });
  }

  protected edit(user: AdminUser): void {
    if (this.saving() || !this.editable(user)) return;
    this.role = user.role;
    this.status = user.status;
    this.reason = '';
    this.error.set('');
    this.success.set('');
    this.selected.set(user);
  }

  protected save(): void {
    const user = this.selected();
    if (!user || this.saving() || this.reason.trim().length < 5 ||
        (user.role === this.role && user.status === this.status)) return;
    this.saving.set(true);
    this.error.set('');
    this.api.update(user.id, {
      role: this.role, status: this.status, reason: this.reason.trim(), version: user.version
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: updated => {
        this.users.update(users => users.map(item => item.id === updated.id ? updated : item));
        this.saving.set(false);
        this.selected.set(null);
        this.success.set('Alteração salva e registrada na auditoria.');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err.status === 409 ?
          'Os dados mudaram ou esta alteração não é permitida. Atualize a lista antes de tentar novamente.' :
          'Não foi possível confirmar a alteração. Atualize a lista e confira o estado do usuário.');
      }
    });
  }
}

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminService, AuditEvent } from '../../core/services/admin.service';

@Component({
  selector: 'app-audit-page',
  imports: [DatePipe],
  templateUrl: './audit.page.html',
  styleUrl: './audit.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditPage {
  private readonly api = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly entries = signal<AuditEvent[]>([]);
  protected readonly page = signal(0);
  protected readonly hasNext = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly roleLabels = { CLIENT: 'Cliente', MANAGER: 'Gerente', ADMIN: 'Administrador' };
  protected readonly statusLabels = { ACTIVE: 'Ativo', BLOCKED: 'Bloqueado' };
  constructor() { this.load(); }

  protected load(page = this.page()): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(false);
    this.api.events(page).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: entries => {
        this.entries.set(entries.slice(0, 50));
        this.hasNext.set(entries.length > 50);
        this.page.set(page);
        this.loading.set(false);
      },
      error: () => { this.entries.set([]); this.error.set(true); this.loading.set(false); }
    });
  }
}

import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminService, AdminSummary, AdminUser, AuditEvent } from '../../core/services/admin.service';
import { DashboardOverview } from '../../core/models/banking.models';
import { AuthStore } from '../../core/state/auth.store';
import { FinanceChartComponent } from '../../shared/components/finance-chart/finance-chart.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink, FinanceChartComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPage {
  private readonly route = inject(ActivatedRoute);
  private readonly admin = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly authStore = inject(AuthStore);
  protected readonly overview = this.route.snapshot.data['overview'] as DashboardOverview;
  protected readonly role = this.authStore.viewRole;
  protected readonly greetingName = computed(() => {
    const name = this.authStore.displayName().trim();
    return (name.includes('@') ? name.split('@')[0] : name) || 'cliente';
  });
  protected readonly managerOrAdmin = computed(() => this.authStore.isDemo() && this.role() !== 'cliente');
  protected readonly summary = signal<AdminSummary | null>(null);
  protected readonly users = signal<AdminUser[]>([]);
  protected readonly recentAudit = signal<AuditEvent[]>([]);
  protected readonly managementLoading = signal(false);
  protected readonly managementError = signal(false);
  protected readonly totalBalance = this.overview.accounts.reduce((sum, account) => sum + account.balance, 0);
  protected readonly credits = this.overview.transactions.filter(item => item.amount > 0)
    .reduce((sum, item) => sum + item.amount, 0);
  protected readonly debits = this.overview.transactions.filter(item => item.amount < 0)
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);
  protected readonly pending = this.overview.transactions.filter(item => item.status === 'pendente' || item.status === 'agendado').length;

  constructor() {
    if (this.managerOrAdmin()) this.loadManagement();
  }

  protected loadManagement(): void {
    if (!this.managerOrAdmin() || this.managementLoading()) return;
    this.managementLoading.set(true);
    this.managementError.set(false);
    this.admin.summary().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => { this.summary.set(data); this.managementLoading.set(false); },
      error: () => { this.summary.set(null); this.managementError.set(true); this.managementLoading.set(false); }
    });
    this.admin.users(0).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => this.users.set(data.filter(user => !user.demo).slice(0, 5)),
      error: () => this.users.set([])
    });
    if (this.role() === 'admin') {
      this.admin.events(0).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: data => this.recentAudit.set(data.slice(0, 4)),
        error: () => this.recentAudit.set([])
      });
    }
  }
}

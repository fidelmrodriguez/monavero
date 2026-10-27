import { CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DashboardOverview } from '../../core/models/banking.models';
import { AuthStore } from '../../core/state/auth.store';
import { FinanceChartComponent } from '../../shared/components/finance-chart/finance-chart.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [CurrencyPipe, DatePipe, PercentPipe, RouterLink, FinanceChartComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly authStore = inject(AuthStore);
  protected readonly overview = this.route.snapshot.data['overview'] as DashboardOverview;
  protected readonly totalInvestments = computed(() => this.overview.investments.reduce((sum, item) => sum + item.value, 0));
  protected readonly totalCardUsed = computed(() => this.overview.cards.reduce((sum, item) => sum + item.used, 0));
}

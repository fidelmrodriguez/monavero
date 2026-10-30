import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DashboardOverview } from '../../core/models/banking.models';
import { AuthStore } from '../../core/state/auth.store';
import { FinanceChartComponent } from '../../shared/components/finance-chart/finance-chart.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [CurrencyPipe, DatePipe, RouterLink, FinanceChartComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly authStore = inject(AuthStore);
  protected readonly overview = this.route.snapshot.data['overview'] as DashboardOverview;
}

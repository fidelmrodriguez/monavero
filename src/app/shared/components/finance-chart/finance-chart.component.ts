import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FinancePoint } from '../../../core/models/banking.models';

@Component({
  selector: 'app-finance-chart',
  imports: [CurrencyPipe],
  templateUrl: './finance-chart.component.html',
  styleUrl: './finance-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FinanceChartComponent {
  @Input() set data(value: FinancePoint[]) {
    this.dataState.set(value);
  }
  @Input() title = '';
  @Input() eyebrow = 'Indicador';
  @Input() variant: 'line' | 'bar' = 'line';

  private readonly dataState = signal<FinancePoint[]>([]);
  protected readonly total = computed(() => this.dataState().reduce((sum, item) => sum + item.value, 0));
  protected readonly normalizedPoints = computed(() => {
    const data = this.dataState();
    const values = data.map((item) => item.value);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 1);
    const range = max - min || 1;
    return data.map((item, index) => ({
      label: item.label,
      value: item.value,
      x: 18 + index * (324 / Math.max(data.length - 1, 1)),
      y: 126 - ((item.value - min) / range) * 92
    }));
  });
  protected readonly points = computed(() => this.normalizedPoints().map((point) => `${point.x},${point.y}`).join(' '));
  protected readonly areaPoints = computed(() => `18,138 ${this.points()} 342,138`);
  protected readonly normalizedBars = computed(() => {
    const data = this.dataState();
    const max = Math.max(...data.map((item) => item.value), 1);
    return data.map((item) => ({ ...item, percent: Math.max(8, (item.value / max) * 100) }));
  });
}

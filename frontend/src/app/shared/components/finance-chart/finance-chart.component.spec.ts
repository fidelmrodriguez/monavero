import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinanceChartComponent } from './finance-chart.component';

describe('FinanceChartComponent', () => {
  let component: FinanceChartComponent;
  let fixture: ComponentFixture<FinanceChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanceChartComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FinanceChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente de gráfico financeiro', () => {
    expect(component).toBeTruthy();
  });
});

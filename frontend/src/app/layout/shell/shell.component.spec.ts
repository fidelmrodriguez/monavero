import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  let component: ShellComponent;
  let fixture: ComponentFixture<ShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [provideRouter([]), provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o layout autenticado', () => {
    expect(component).toBeTruthy();
  });

  it('mantém navegação e sidebar compacta sem conteúdo de teste', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Transferências');
    expect(text).toContain('Agendamentos');
    expect(text).toContain('Pagamentos');
    expect(text).not.toContain('Simulação de Pix');
    expect(text).not.toContain('Consulte saldos e movimente valores ilustrativos');
  });
});

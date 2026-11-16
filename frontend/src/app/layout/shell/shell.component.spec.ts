import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotificationStore } from '../../core/state/notification.store';
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

  it('reconhece notificações somente ao abrir o dropdown, não ao fechá-lo', () => {
    const store = TestBed.inject(NotificationStore);
    const acknowledge = spyOn(store, 'acknowledgeOnOpen');
    const bell = fixture.nativeElement.querySelector('.notification-btn') as HTMLButtonElement;

    bell.click();
    fixture.detectChanges();
    expect(acknowledge).toHaveBeenCalledTimes(1);
    expect(bell.getAttribute('aria-expanded')).toBe('true');

    bell.click();
    fixture.detectChanges();
    expect(acknowledge).toHaveBeenCalledTimes(1);
    expect(bell.getAttribute('aria-expanded')).toBe('false');
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

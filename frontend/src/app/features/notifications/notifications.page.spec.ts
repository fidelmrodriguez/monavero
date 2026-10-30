import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationsPage } from './notifications.page';

describe('NotificationsPage', () => {
  let component: NotificationsPage;
  let fixture: ComponentFixture<NotificationsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsPage]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar a página de notificações', () => {
    expect(component).toBeTruthy();
  });

  it('não mostra notificações inventadas ao entrar', () => {
    expect(fixture.nativeElement.textContent).toContain('Nenhuma notificação no momento');
    expect(fixture.nativeElement.textContent).not.toContain('Simulação de Pix');
  });
});

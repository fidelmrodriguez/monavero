import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { ApiReadinessService } from './core/services/api-readiness.service';
import { signal, WritableSignal } from '@angular/core';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        // Evita contato real com a Blitz durante o teste da raiz.
        { provide: ApiReadinessService, useValue: {
          ready: signal(true), elapsedSeconds: signal(0), elapsedLabel: signal('00:00'),
          wakeUrl: 'https://monavero-api.fidelmrodriguez.blitz.cloud/actuator/health',
          start: jasmine.createSpy('start')
        } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente raiz', () => {
    expect(component).toBeTruthy();
  });

  it('oferece recuperação de conexão em uma nova aba quando o acesso demora', () => {
    const readiness = TestBed.inject(ApiReadinessService);
    // A opção de recuperação é exibida após a verificação inicial.
    (readiness.ready as WritableSignal<boolean>).set(false);
    (readiness.elapsedSeconds as WritableSignal<number>).set(8);
    fixture.detectChanges();

    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector('.api-wakeup-link');
    expect(link).not.toBeNull();
    expect(link?.href).toBe('https://monavero-api.fidelmrodriguez.blitz.cloud/actuator/health');
    expect(fixture.nativeElement.textContent).not.toContain('Blitz Cloud');
    expect(fixture.nativeElement.textContent).not.toContain('API Java');
    expect(link?.target).toBe('_blank');
    expect(link?.rel).toContain('noopener');
    expect(link?.rel).toContain('noreferrer');
  });

});

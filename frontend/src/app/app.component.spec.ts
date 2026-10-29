import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { ApiReadinessService } from './core/services/api-readiness.service';
import { signal } from '@angular/core';

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
          ready: signal(true), elapsedLabel: signal('00:00'), start: jasmine.createSpy('start')
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
});

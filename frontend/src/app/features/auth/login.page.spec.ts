import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o formulário com acesso rápido', () => {
    expect(component).toBeTruthy();
    expect(component.form.getRawValue().username).toBe('User');
    expect(component.form.getRawValue().role).toBe('cliente');
    expect(component.form.valid).toBeTrue();
  });

  it('deve apresentar a identidade Monavero e identificar o ambiente de demonstração', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Monavero');
    expect(text).toContain('Acesso demonstrativo');
  });

  it('deve invalidar senha curta', () => {
    component.form.controls.password.setValue('123');
    expect(component.form.invalid).toBeTrue();
  });
});

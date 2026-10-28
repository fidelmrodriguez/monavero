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

  it('pré-preenche o demo sem impedir edição dos campos', () => {
    expect(component.form.getRawValue().username).toBe('User');
    expect(component.form.getRawValue().password).toBe('1234');
    component.form.controls.username.setValue('pessoal@exemplo.com');
    expect(component.form.getRawValue().username).toBe('pessoal@exemplo.com');
  });

  it('exibe login e cadastro, sem permitir escolher admin pelo navegador', () => {
    expect(fixture.nativeElement.textContent).toContain('Monavero');
    expect(fixture.nativeElement.querySelector('#role')).toBeNull();
    component.changeMode('register');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Criar conta');
  });

  it('exige senha forte no cadastro', () => {
    component.registration.setValue({ name: 'Teste', email: 'teste@exemplo.com', password: 'curta' });
    expect(component.registration.invalid).toBeTrue();
    component.registration.controls.password.setValue('senha-exemplo-segura');
    expect(component.registration.valid).toBeTrue();
  });
});

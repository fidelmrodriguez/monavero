import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { AuthStore } from '../../core/state/auth.store';
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
    expect(component.form.getRawValue().role).toBe('cliente');
    component.form.controls.username.setValue('pessoal@exemplo.com');
    expect(component.form.getRawValue().username).toBe('pessoal@exemplo.com');
  });

  it('exibe os três perfis apenas na demonstração, sem permitir atribuir papel no cadastro', () => {
    expect(fixture.nativeElement.textContent).toContain('Monavero');
    expect(fixture.nativeElement.querySelector('#role')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('#role option').length).toBe(3);
    component.changeMode('register');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Criar conta');
    expect(fixture.nativeElement.querySelector('#role')).toBeNull();
  });

  it('usa User/1234 também para gerente e administrador, sem pedir nova senha', () => {
    const store = TestBed.inject(AuthStore);
    const demoSpy = spyOn(store, 'demo').and.returnValue(of(null));
    component.form.controls.role.setValue('gerente');
    component.submit();
    expect(demoSpy).toHaveBeenCalledWith('gerente');
    component.form.controls.role.setValue('admin');
    component.submit();
    expect(demoSpy).toHaveBeenCalledWith('admin');
    expect(component.form.getRawValue().username).toBe('User');
    expect(component.form.getRawValue().password).toBe('1234');
  });

  it('ignora o seletor em um login pessoal e deixa a autorização com o backend', () => {
    const store = TestBed.inject(AuthStore);
    const loginSpy = spyOn(store, 'login').and.returnValue(of(null));
    const demoSpy = spyOn(store, 'demo').and.returnValue(of(null));
    component.form.setValue({username: 'pessoal@exemplo.com', password: 'senha-segura', role: 'admin'});
    component.submit();
    expect(loginSpy).toHaveBeenCalledWith('pessoal@exemplo.com', 'senha-segura');
    expect(demoSpy).not.toHaveBeenCalled();
  });

  it('exige senha forte no cadastro', () => {
    component.registration.setValue({ name: 'Teste', email: 'teste@exemplo.com', password: 'curta' });
    expect(component.registration.invalid).toBeTrue();
    component.registration.controls.password.setValue('senha-exemplo-segura');
    expect(component.registration.valid).toBeTrue();
  });
});

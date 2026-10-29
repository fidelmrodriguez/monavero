import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthSession } from '../../core/models/auth.models';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { loginIdentifierValidator } from './login.page';
import { FormControl } from '@angular/forms';
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
    expect(fixture.nativeElement.querySelector('.login-topbar #role')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('form #role')).toBeNull();
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

  it('exige e-mail para contas pessoais, mas mantém o atalho User', () => {
    expect(loginIdentifierValidator(new FormControl('User'))).toBeNull();
    expect(loginIdentifierValidator(new FormControl('pessoal@exemplo.com'))).toBeNull();
    expect(loginIdentifierValidator(new FormControl('Pessoa Exemplo'))).toEqual({ emailOrDemo: true });
    expect(loginIdentifierValidator(new FormControl('usuario-invalido'))).toEqual({ emailOrDemo: true });
  });

  it('não envia ao backend um nome sem e-mail; explica como entrar na conta', () => {
    const store = TestBed.inject(AuthStore);
    const loginSpy = spyOn(store, 'login').and.returnValue(of(null));
    component.form.controls.username.setValue('Fulano');
    component.submit();
    fixture.detectChanges();
    expect(loginSpy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('O nome não é usado para login');
  });

  it('limpa 1234 ao trocar User pelo e-mail da conta pessoal', () => {
    expect(component.form.controls.password.value).toBe('1234');
    component.form.controls.username.setValue('pessoal@exemplo.com');
    component.onUsernameInput();
    expect(component.form.controls.password.value).toBe('');
    expect(component.form.invalid).toBeTrue();
  });

  it('mostra ajuda quando o backend rejeita as credenciais da conta', () => {
    const store = TestBed.inject(AuthStore);
    const loginSpy = spyOn(store, 'login').and.returnValue(of(null));
    component.form.patchValue({ username: 'pessoal@exemplo.com', password: 'senha-segura-2026' });
    component.submit();
    fixture.detectChanges();
    expect(loginSpy).toHaveBeenCalledWith('pessoal@exemplo.com', 'senha-segura-2026');
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('e-mail do cadastro');
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).not.toContain('senha-segura-2026');
  });

  it('envia cadastro pessoal com e-mail e a senha escolhida', () => {
    const store = TestBed.inject(AuthStore);
    const registerSpy = spyOn(store, 'register').and.returnValue(of(null));
    component.changeMode('register');
    component.registration.setValue({ name: 'Pessoa Exemplo', email: 'pessoal@exemplo.com', password: 'senha-segura-2026' });
    component.submit();
    expect(registerSpy).toHaveBeenCalledWith('Pessoa Exemplo', 'pessoal@exemplo.com', 'senha-segura-2026');
  });

  it('exibe carregamento e bloqueia envio duplicado durante autenticação', () => {
    const store = TestBed.inject(AuthStore);
    const demoSpy = spyOn(store, 'demo').and.returnValue(of(null));
    store.isLoading.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.auth-progress')?.textContent).toContain('Autenticando');
    expect(fixture.nativeElement.querySelector('.login-card').getAttribute('aria-busy')).toBe('true');
    component.submit();
    expect(demoSpy).not.toHaveBeenCalled();
    store.isLoading.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.auth-progress')).toBeNull();
  });

  it('mantém o loading até o dashboard concluir a navegação', () => {
    const store = TestBed.inject(AuthStore);
    const router = TestBed.inject(Router);
    spyOn(store, 'demo').and.returnValue(of({} as AuthSession));
    spyOn(router, 'navigateByUrl').and.returnValue(new Promise<boolean>(() => { }));
    component.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.auth-progress')).not.toBeNull();
  });

  it('indica criação da conta quando o cadastro está em processamento', () => {
    const store = TestBed.inject(AuthStore);
    component.changeMode('register');
    store.isLoading.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.auth-progress')?.textContent).toContain('Criando sua conta');
    store.isLoading.set(false);
  });

  it('exige senha forte no cadastro', () => {
    component.registration.setValue({ name: 'Teste', email: 'teste@exemplo.com', password: 'curta' });
    expect(component.registration.invalid).toBeTrue();
    component.registration.controls.password.setValue('senha-exemplo-segura');
    expect(component.registration.valid).toBeTrue();
  });
});

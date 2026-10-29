import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/state/auth.store';
import { ThemeStore } from '../../core/state/theme.store';
import { UserRole } from '../../core/models/auth.models';

/** O backend identifica contas pessoais pelo e-mail único; apenas User é um atalho demo. */
export function loginIdentifierValidator(control: AbstractControl): ValidationErrors | null {
  const identifier = String(control.value ?? '').trim();
  if (!identifier || identifier.toLowerCase() === 'user') return null;
  return Validators.email(new FormControl(identifier)) === null ? null : { emailOrDemo: true };
}

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  protected readonly authStore = inject(AuthStore);
  protected readonly themeStore = inject(ThemeStore);
  readonly mode = signal<'login' | 'register'>('login');
  readonly loginError = signal<string | null>(null);
  /** Mantém o overlay até o Router realmente sair da página de login. */
  readonly navigating = signal(false);

  // Os dois campos continuam editáveis e começam com o atalho do ambiente demo.
  readonly form = this.fb.group({
    username: ['User', [Validators.required, loginIdentifierValidator]],
    password: ['1234', [Validators.required, Validators.minLength(4)]],
    role: this.fb.control<UserRole>('cliente', [Validators.required])
  });
  readonly registration = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]]
  });

  onUsernameInput(): void {
    this.loginError.set(null);
    // A senha pré-preenchida pertence somente ao atalho demo. Não a envie em um login pessoal.
    if (this.form.controls.username.value.trim().toLowerCase() !== 'user' &&
        this.form.controls.password.value === '1234') {
      this.form.controls.password.setValue('');
    }
  }

  changeMode(mode: 'login' | 'register'): void {
    this.loginError.set(null);
    this.mode.set(mode);
  }

  submit(): void {
    if (this.authStore.isLoading() || this.navigating()) return; // impede solicitações duplicadas
    this.loginError.set(null);
    if (this.mode() === 'register') {
      if (this.registration.invalid) { this.registration.markAllAsTouched(); return; }
      const { name, email, password } = this.registration.getRawValue();
      this.authStore.register(name, email, password).subscribe(session => this.finish(session));
      return;
    }
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { username, password, role } = this.form.getRawValue();
    const identifier = username.trim();
    const guest = identifier.toLowerCase() === 'user' && password === '1234';
    // A opção de perfil vale apenas para User/1234; contas reais usam o papel da API.
    const request = guest ? this.authStore.demo(role) : this.authStore.login(identifier, password);
    request.subscribe(session => {
      if (session) { this.finish(session); return; }
      this.loginError.set(guest
        ? 'Não foi possível abrir a demonstração. Verifique a conexão e tente novamente.'
        : 'Não foi possível entrar. Para uma conta criada, use o e-mail do cadastro e a senha escolhida (não o nome nem a senha 1234 da demonstração).');
    });
  }

  private finish(session: unknown): void {
    if (!session) return;
    this.navigating.set(true);
    void this.router.navigateByUrl('/app/dashboard').then(success => {
      if (!success) {
        this.navigating.set(false);
        this.loginError.set('Não foi possível abrir o dashboard. Tente novamente.');
      }
    }).catch(() => {
      this.navigating.set(false);
      this.loginError.set('Não foi possível abrir o dashboard. Tente novamente.');
    });
  }
}

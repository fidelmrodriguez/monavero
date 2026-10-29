import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/state/auth.store';
import { ThemeStore } from '../../core/state/theme.store';
import { UserRole } from '../../core/models/auth.models';

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

  // Os dois campos continuam editáveis e começam com o atalho do ambiente demo.
  readonly form = this.fb.group({
    username: ['User', [Validators.required]],
    password: ['1234', [Validators.required, Validators.minLength(4)]],
    role: this.fb.control<UserRole>('cliente', [Validators.required])
  });
  readonly registration = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]]
  });

  changeMode(mode: 'login' | 'register'): void { this.mode.set(mode); }

  submit(): void {
    if (this.mode() === 'register') {
      if (this.registration.invalid) { this.registration.markAllAsTouched(); return; }
      const { name, email, password } = this.registration.getRawValue();
      this.authStore.register(name, email, password).subscribe(session => this.finish(session));
      return;
    }
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { username, password, role } = this.form.getRawValue();
    const guest = username.trim().toLowerCase() === 'user' && password === '1234';
    // A opção de perfil vale apenas para User/1234; contas reais usam o papel da API.
    const request = guest ? this.authStore.demo(role) : this.authStore.login(username, password);
    request.subscribe(session => this.finish(session));
  }

  private finish(session: unknown): void {
    if (session) void this.router.navigateByUrl('/app/dashboard');
  }
}

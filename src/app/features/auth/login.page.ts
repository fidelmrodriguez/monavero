import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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

  readonly form = this.fb.group({
    username: ['User', [Validators.required]],
    password: ['1234', [Validators.required, Validators.minLength(4)]],
    role: ['cliente' as UserRole, [Validators.required]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, password, role } = this.form.getRawValue();
    this.authStore.login(username, password, role).subscribe((session) => {
      if (session) {
        this.router.navigateByUrl('/app/dashboard');
      }
    });
  }
}

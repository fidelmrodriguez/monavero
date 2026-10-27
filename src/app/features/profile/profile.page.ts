import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '../../core/state/auth.store';
import { ThemeMode, ThemeStore } from '../../core/state/theme.store';

@Component({
  selector: 'app-profile-page',
  imports: [FormsModule],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePage {
  protected readonly authStore = inject(AuthStore);
  protected readonly themeStore = inject(ThemeStore);

  protected changeTheme(theme: ThemeMode): void {
    this.themeStore.setMode(theme);
  }
}

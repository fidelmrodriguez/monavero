import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NotificationStore } from './core/state/notification.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  protected readonly notificationStore = inject(NotificationStore);
  private readonly router = inject(Router);

  protected showToasts(): boolean {
    return !this.router.url.startsWith('/login');
  }
}

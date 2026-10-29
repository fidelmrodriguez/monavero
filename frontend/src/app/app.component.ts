import { ChangeDetectionStrategy, Component, afterNextRender, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NotificationStore } from './core/state/notification.store';
import { ApiReadinessService } from './core/services/api-readiness.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  protected readonly notificationStore = inject(NotificationStore);
  protected readonly apiReadiness = inject(ApiReadinessService);

  constructor() {
    // Quando não há navegação inicial (ou durante a hidratação), inicia a checagem
    // depois do primeiro render. Os guards também podem iniciá-la antes disso.
    afterNextRender(() => this.apiReadiness.start());
  }

  private readonly router = inject(Router);

  protected showToasts(): boolean {
    return !this.router.url.startsWith('/login');
  }
}

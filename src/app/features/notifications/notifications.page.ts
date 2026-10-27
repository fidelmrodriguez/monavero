import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationStore } from '../../core/state/notification.store';

@Component({
  selector: 'app-notifications-page',
  imports: [DatePipe],
  templateUrl: './notifications.page.html',
  styleUrl: './notifications.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationsPage {
  protected readonly notificationStore = inject(NotificationStore);
}

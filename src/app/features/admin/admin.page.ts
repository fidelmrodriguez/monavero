import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthStore } from '../../core/state/auth.store';
import { NotificationStore } from '../../core/state/notification.store';

@Component({
  selector: 'app-admin-page',
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPage {
  private readonly notificationStore = inject(NotificationStore);
  protected readonly authStore = inject(AuthStore);
  protected readonly policies = [
    { icon: '🛡️', title: 'Permissões', description: 'Controle de perfis e acesso por módulo operacional.' },
    { icon: '💳', title: 'Limites transacionais', description: 'Parâmetros de limite para transferências, pagamentos e cartões.' },
    { icon: '📡', title: 'Monitoramento', description: 'Eventos de segurança, tentativas bloqueadas e trilhas de auditoria.' }
  ];

  protected simulateAction(area: string): void {
    this.notificationStore.add({
      title: 'Ação administrativa registrada',
      message: `${area} foi enviada para revisão operacional.`,
      type: 'success'
    });
  }
}

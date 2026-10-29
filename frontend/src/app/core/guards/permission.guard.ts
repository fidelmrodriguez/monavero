import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthStore } from '../state/auth.store';
import { NotificationStore } from '../state/notification.store';
import { UserRole } from '../models/auth.models';

export const permissionGuard: CanActivateFn = (route) => {
  const authStore = inject(AuthStore);
  const notificationStore = inject(NotificationStore);
  const router = inject(Router);
  const allowedRoles = route.data['roles'] as UserRole[] | undefined;

  // Páginas de auditoria/administração são simulações locais para avaliar a UI.
  // O backend segue autorizando exclusivamente pelo papel real do token.
  if (!allowedRoles?.length || allowedRoles.includes(authStore.viewRole())) {
    return true;
  }

  notificationStore.add({
    title: 'Acesso restrito',
    message: 'Seu perfil não possui permissão para acessar esta área.',
    type: 'warning'
  });

  return router.createUrlTree(['/app/dashboard']);
};

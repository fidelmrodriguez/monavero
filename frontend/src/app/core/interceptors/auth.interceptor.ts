import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../state/auth.store';
import { NotificationStore } from '../state/notification.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const notificationStore = inject(NotificationStore);
  const token = authStore.session()?.accessToken;
  const isExternalApi = req.url.includes('dummyjson.com');

  const request = token && isExternalApi
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((error) => {
      notificationStore.add({
        title: 'Falha de comunicação',
        message: 'A operação não pôde ser concluída agora.',
        type: 'danger'
      });
      return throwError(() => error);
    })
  );
};

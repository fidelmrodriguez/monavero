import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from '../state/auth.store';
import { MONAVERO_API_URL } from '../config/monavero-api';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(AuthStore);
  const token = store.session()?.accessToken;
  // Nunca enviar tokens do Monavero à DummyJSON ou a outros serviços externos.
  const isMonaveroApi = req.url.startsWith(`${MONAVERO_API_URL}/api/`);
  const isPublicAuth = /\/api\/v1\/auth\/(login|register|demo)$/.test(req.url);
  const request = token && isMonaveroApi && !isPublicAuth
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;
  return next(request);
};

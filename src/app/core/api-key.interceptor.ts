import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

/** Añade `x-api-key` a las peticiones REST hacia el backend de telemetría. */
export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.apiKey || !req.url.startsWith(environment.apiUrl)) return next(req);
  return next(req.clone({ setHeaders: { 'x-api-key': environment.apiKey } }));
};

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('accessToken');

  if (req.url.includes('/auth/login')) {
    return next(req);
  }

  let request = req;

  if (token) {
    const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    request = req.clone({
      setHeaders: {
        Authorization: authHeader,
      },
    });
  }

  return next(request).pipe(
    // manejo básico de errores si deseas
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 || error.status === 403) {
        console.warn('Token inválido, redirigiendo...');
        localStorage.removeItem('accessToken');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};

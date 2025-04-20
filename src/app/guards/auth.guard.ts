import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // Verificar si hay un token en localStorage
  const token = localStorage.getItem('token');
  
  if (token) {
    return true;
  } else {
    // Redirigir al login si no hay token
    router.navigate(['/login']);
    return false;
  }
}; 
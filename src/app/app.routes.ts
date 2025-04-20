import { Routes } from '@angular/router';
import { LayoutPage } from './pages/layout/layout.page'; // ✅ Asegúrate de que el path sea correcto
import { authGuard } from './guards/auth.guard'; // Importamos el guardia

export const routes: Routes = [
  {
    path: 'layout',
    component: LayoutPage,
    canActivate: [authGuard], // Protegemos la ruta con el guardia
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./pages/usuarios/usuarios.page').then((m) => m.UsuariosPage),
      },
      {
        path: 'ubicaciones',
        loadComponent: () =>
          import('./pages/ubicaciones/ubicaciones.page').then(
            (m) => m.UbicacionesPage
          ),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: 'login', // Cambiamos el redirect a login en lugar de layout
    pathMatch: 'full',
  },
  {
    path: 'ubicacion',
    loadComponent: () => import('./ubicacion/ubicacion.page').then( m => m.UbicacionPage),
    canActivate: [authGuard], // Protegemos la ruta con el guardia
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  }
];

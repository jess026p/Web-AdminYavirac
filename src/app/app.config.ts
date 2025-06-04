import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient } from '@angular/common/http';
import { FormularioUsuarioComponent } from './pages/usuarios/formulario-usuario/formulario-usuario.component';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideIonicAngular(),
    provideHttpClient(),
    importProvidersFrom(FormularioUsuarioComponent)
  ]
}; 
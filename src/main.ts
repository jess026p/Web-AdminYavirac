import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/interceptors/auth.interceptor';

import { addIcons } from 'ionicons';
import {
  close,
  personAddOutline,
  personCircleOutline,
  logOutOutline,
  trashOutline,
  pencilOutline,
  homeOutline,
  locationOutline
} from 'ionicons/icons';

// ✅ Agrega todos los íconos que usas en botones/modales/headers
addIcons({
  'close': close,
  'person-add-outline': personAddOutline,
  'person-circle-outline': personCircleOutline,
  'log-out-outline': logOutOutline,
  'trash-outline': trashOutline,
  'pencil-outline': pencilOutline,
  'home-outline': homeOutline,
  'location-outline': locationOutline,
});

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
});

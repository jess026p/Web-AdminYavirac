import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';

import { addIcons } from 'ionicons';
import { homeOutline, personOutline, locationOutline, calendarOutline, shieldCheckmarkOutline, peopleOutline, briefcaseOutline } from 'ionicons/icons';

addIcons({
  'home-outline': homeOutline,
  'person-outline': personOutline,
  'location-outline': locationOutline,
  'calendar-outline': calendarOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'people-outline': peopleOutline,
  'briefcase-outline': briefcaseOutline
});

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
  templateUrl: './layout.page.html',
  styleUrls: ['./layout.page.scss'],
})
export class LayoutPage implements OnInit, OnDestroy {
  nombreUsuario: string = '';
  rolUsuario: string = '';
  private userSubscription: Subscription | undefined;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Cargar datos iniciales
    this.updateUserInfo();

    // Suscribirse a cambios en el usuario
    this.userSubscription = this.authService.user$.subscribe(user => {
      this.updateUserInfo();
    });
  }

  ngOnDestroy() {
    // Limpiar la suscripción al destruir el componente
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  private updateUserInfo() {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      this.nombreUsuario = `${user.name || ''} ${user.lastname || ''}`;
      this.rolUsuario = user.roles?.[0]?.name || 'Sin rol';
    } else {
      this.nombreUsuario = '';
      this.rolUsuario = '';
    }
  }

  logout() {
    this.authService.logout();
  }
}

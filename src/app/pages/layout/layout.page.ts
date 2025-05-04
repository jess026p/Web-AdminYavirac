import { Component,OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import {Router, RouterModule} from '@angular/router';
import { CommonModule } from '@angular/common';

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
export class LayoutPage implements OnInit {
  nombreUsuario: string = '';
  rolUsuario: string = '';

  constructor(private router: Router) {}

  ngOnInit() {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      this.nombreUsuario = `${user.name || ''} ${user.lastname || ''}`;
      this.rolUsuario = user.roles?.[0]?.name || 'Sin rol';
    }
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
}

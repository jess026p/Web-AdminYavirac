import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-header',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './user-header.component.html',
  styleUrls: ['./user-header.component.scss'],
})
export class UserHeaderComponent {
  nombreUsuario: string = '';
  rolUsuario: string = '';

  constructor(private router: Router) {
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

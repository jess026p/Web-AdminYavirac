import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  username = '';
  password = '';

  constructor(
    private authService: AuthService,
    private alertCtrl: AlertController,
    private router: Router
  ) {}

  async login() {
    try {
      console.log('Intentando login con:', { username: this.username });

      if (!this.username || !this.password) {
        await this.mostrarAlerta('Datos incompletos', 'Por favor ingresa usuario y contraseña.');
        return;
      }

      const response = await firstValueFrom(
        this.authService.login({
          username: this.username,
          password: this.password,
        })
      );

      console.log('Respuesta del servidor:', response);

      if (response?.data?.accessToken) {
        const token = response.data.accessToken;
        const userData = response.data.auth;

        // Validar si el usuario tiene el rol "Administrador"
        const esAdmin = userData.roles?.some((rol: any) => rol.name === 'Administrador');

        if (esAdmin) {
          localStorage.setItem('accessToken', token);
          localStorage.setItem('user', JSON.stringify(userData));
          await this.mostrarAlerta('Bienvenido', 'Has iniciado sesión exitosamente.');
          this.router.navigate(['/layout/home']);
        } else {
          await this.mostrarAlerta('Acceso denegado', 'Solo los usuarios con rol Administrador pueden iniciar sesión.');
        }
      } else {
        console.error('Estructura de respuesta inesperada:', response);
        await this.mostrarAlerta('Error de formato', 'El servidor respondió con un formato inesperado.');
      }

    } catch (error: any) {
      console.error('Error en login:', error);
      let mensajeError = 'Error de conexión con el servidor';

      if (error.message) {
        mensajeError = error.message;
      }

      await this.mostrarAlerta('Error', mensajeError);
    }
  }

  private async mostrarAlerta(titulo: string, mensaje: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: titulo,
      message: mensaje,
      buttons: ['OK'],
    });
    await alert.present();
  }
}

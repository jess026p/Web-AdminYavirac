import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';

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

  // URL de la API de autenticación
  private apiUrl = 'http://localhost:3000/api/v1/auth/login';

  constructor(
    private http: HttpClient,
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

      const response: any = await firstValueFrom(
        this.http.post(this.apiUrl, {
          username: this.username,
          password: this.password,
        }).pipe(
          timeout(10000)
        )
      );

      console.log('Respuesta del servidor:', response);

      // Esperamos: { data: { accessToken, auth }, message, title, ... }
      if (response?.data?.accessToken) {
        const token = response.data.accessToken;
        const userData = response.data.auth;

        // Guardar token y datos del usuario
        localStorage.setItem('accessToken', token);
        localStorage.setItem('user', JSON.stringify(userData));

        await this.mostrarAlerta('Bienvenido', 'Has iniciado sesión exitosamente.');
        this.router.navigate(['/layout/home']);
      } else {
        console.error('Estructura de respuesta inesperada:', response);
        await this.mostrarAlerta('Error de formato', 'El servidor respondió con un formato inesperado.');
      }

    } catch (error: any) {
      console.error('Error en login:', error);
      let mensajeError = 'Error de conexión con el servidor';

      if (error instanceof HttpErrorResponse) {
        if (error.status === 0) {
          mensajeError = 'No se puede conectar al servidor. Verifica que el backend esté en ejecución.';
        } else if (error.status === 401) {
          mensajeError = 'Credenciales inválidas. Verifica tu usuario y contraseña.';
        } else if (error.status === 403) {
          mensajeError = 'No tienes permisos para acceder a la aplicación.';
        } else if (error.error?.message) {
          mensajeError = error.error.message;
        }
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

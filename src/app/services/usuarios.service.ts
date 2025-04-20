import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, tap, timeout } from 'rxjs';

// Interfaz para datos locales durante el desarrollo
export interface UsuarioSimple {
  id?: number;
  nombre: string;
  apellido: string;
  correo: string;
  password?: string;
}

// Usa estas interfaces para el backend real
export interface Role {
  id: string;
  name?: string;
  code?: string;
}

export interface Usuario {
  id?: string;
  username: string;
  name: string;
  lastname: string;
  email: string;
  password?: string;
  identification: string;
  roles: Role[];
  passwordChanged?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  // URLs para la API de usuarios
  private apiUrl = 'http://localhost:3000/api/v1/users';
  private rolesUrl = 'http://localhost:3000/api/v1/roles';

  // Datos para desarrollo local (solo se usarán en caso de fallo crítico)
  private usuariosLocales: any[] = [
    { 
      id: '1', 
      username: 'anamora', 
      name: 'Ana', 
      lastname: 'Mora', 
      email: 'ana@correo.com',
      identification: '1234567890',
      roles: [{ id: '1', name: 'Admin', code: 'admin' }]
    },
    { 
      id: '2', 
      username: 'luisperez', 
      name: 'Luis', 
      lastname: 'Pérez', 
      email: 'luis@correo.com',
      identification: '0987654321',
      roles: [{ id: '2', name: 'Empleado', code: 'employee' }]
    },
  ];

  constructor(private http: HttpClient) {}

  // Método para obtener la URL del API (usado para depuración)
  getApiUrl(): string {
    return this.apiUrl;
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Error en la petición HTTP:', error);
    let mensajeError = 'Error de conexión con el servidor. Por favor, verifica que el backend esté en ejecución.';
    
    if (error.status === 0) {
      mensajeError = 'No se puede conectar al servidor. Verifica que el backend esté en ejecución y la URL sea correcta.';
    } else if (error.status === 404) {
      mensajeError = 'Endpoint no encontrado. Verifica la URL del API.';
    } else if (error.status === 500) {
      mensajeError = 'Error interno del servidor.';
    } else if (error.status === 401) {
      mensajeError = 'No autorizado. Por favor, vuelva a iniciar sesión.';
    }
    
    console.log('URL que falló:', error.url);
    return throwError(() => new Error(mensajeError));
  }

  obtenerUsuarios(): Observable<any[]> {
    console.log('Conectando con el backend para obtenerUsuarios en:', this.apiUrl);
    return this.http.get<any>(this.apiUrl)
      .pipe(
        timeout(10000), // 10 segundos de timeout
        catchError(error => {
          console.error('Error obteniendo usuarios:', error);
          
          if (error.status === 401) {
            console.error('Error de autenticación. Token probablemente inválido o expirado.');
          }
          
          return this.handleError(error);
        })
      );
  }

  obtenerUsuarioPorId(id: string | number): Observable<any> {
    if (id === undefined) {
      return throwError(() => new Error('No se puede obtener un usuario sin ID'));
    }
    
    console.log(`Obteniendo usuario con ID ${id} desde: ${this.apiUrl}/${id}`);
    return this.http.get<any>(`${this.apiUrl}/${id}`)
      .pipe(
        timeout(10000), // 10 segundos de timeout
        catchError(error => {
          console.error(`Error al obtener usuario con ID ${id}:`, error);
          
          if (error.status === 422) {
            console.error('Error de validación (422):', error.error);
          } else if (error.status === 404) {
            console.error('Usuario no encontrado (404)');
          }
          
          return this.handleError(error);
        })
      );
  }

  obtenerRoles(): Observable<any> {
    return this.http.get<any>(this.rolesUrl)
      .pipe(
        timeout(10000), // 10 segundos de timeout
        catchError(this.handleError)
      );
  }

  /**
   * Crea un nuevo usuario
   * @param usuario Datos del usuario a crear
   * @returns Observable con la respuesta del servidor
   */
  crearUsuario(usuario: Usuario): Observable<Usuario> {
    console.log('Datos originales para crear usuario:', usuario);
    
    // Clonar objeto para evitar modificar el original
    const usuarioParaEnviar = this.prepararDatosUsuario(usuario);
    
    console.log('Datos formateados para enviar al servidor:', usuarioParaEnviar);
    
    return this.http.post<Usuario>(`${this.apiUrl}/user`, usuarioParaEnviar)
      .pipe(
        timeout(10000), // 10 segundos de timeout
        tap(response => console.log('Respuesta del servidor (crear):', response)),
        catchError(error => {
          console.error('Error al crear usuario:', error);
          
          // Extraer mensaje de error del backend
          let mensajeError = 'Error al crear el usuario';
          
          if (error.status === 422) {
            console.error('Error de validación 422:', error.error);
            if (error.error && error.error.message) {
              mensajeError = `Error de validación: ${error.error.message}`;
            } else if (error.error && Array.isArray(error.error)) {
              // Formato de errores de validación de NestJS
              const detallesError = error.error.map((err: any) => 
                `${err.property}: ${Object.values(err.constraints || {}).join(', ')}`
              ).join('; ');
              mensajeError = `Errores de validación: ${detallesError}`;
            }
          }
          
          if (error.status === 401) {
            mensajeError = 'No autorizado. Por favor, vuelva a iniciar sesión.';
          }
          
          if (error.status === 409) {
            mensajeError = 'Ya existe un usuario con ese nombre de usuario o correo electrónico.';
          }
          
          return throwError(() => new Error(mensajeError));
        })
      );
  }

  /**
   * Actualiza un usuario existente
   * @param usuario Datos del usuario a actualizar
   * @returns Observable con la respuesta del servidor
   */
  actualizarUsuario(usuario: Usuario): Observable<Usuario> {
    console.log('Datos originales para actualizar usuario:', usuario);
    
    if (!usuario.id) {
      return throwError(() => new Error('ID de usuario requerido para actualizar'));
    }
    
    // Clonar objeto para evitar modificar el original
    const usuarioParaEnviar = this.prepararDatosUsuario(usuario);
    
    console.log('Datos formateados para enviar al servidor:', usuarioParaEnviar);
    
    return this.http.put<Usuario>(`${this.apiUrl}/user/${usuario.id}`, usuarioParaEnviar)
      .pipe(
        timeout(10000), // 10 segundos de timeout
        tap(response => console.log('Respuesta del servidor (actualizar):', response)),
        catchError(error => {
          console.error('Error al actualizar usuario:', error);
          
          // Extraer mensaje de error del backend
          let mensajeError = 'Error al actualizar el usuario';
          
          if (error.status === 422) {
            console.error('Error de validación 422:', error.error);
            if (error.error && error.error.message) {
              mensajeError = `Error de validación: ${error.error.message}`;
            } else if (error.error && Array.isArray(error.error)) {
              // Formato de errores de validación de NestJS
              const detallesError = error.error.map((err: any) => 
                `${err.property}: ${Object.values(err.constraints || {}).join(', ')}`
              ).join('; ');
              mensajeError = `Errores de validación: ${detallesError}`;
            }
          }
          
          if (error.status === 401) {
            mensajeError = 'No autorizado. Por favor, vuelva a iniciar sesión.';
          }
          
          if (error.status === 404) {
            mensajeError = 'Usuario no encontrado.';
          }
          
          if (error.status === 409) {
            mensajeError = 'Ya existe un usuario con ese nombre de usuario o correo electrónico.';
          }
          
          return throwError(() => new Error(mensajeError));
        })
      );
  }

  /**
   * Prepara los datos del usuario para enviar al servidor
   * @param usuario Datos del usuario a preparar
   * @returns Objeto con los datos formateados correctamente
   */
  private prepararDatosUsuario(usuario: Usuario): any {
    // Clonar objeto para evitar modificar el original
    const usuarioFormateado = { ...usuario };
    
    // Asegurarse de que roles sea un array de IDs
    if (usuarioFormateado.roles && Array.isArray(usuarioFormateado.roles)) {
      usuarioFormateado.roles = usuarioFormateado.roles.map((rol: any) => 
        typeof rol === 'object' && rol !== null ? rol.id : rol
      );
    }
    
    // Eliminar campos vacíos o innecesarios
    if (usuarioFormateado.password === '') {
      delete usuarioFormateado.password;
    }
    
    return usuarioFormateado;
  }

  eliminarUsuario(id: string | number): Observable<any> {
    if (id === undefined) {
      return throwError(() => new Error('No se puede eliminar un usuario sin ID'));
    }
    
    return this.http.delete(`${this.apiUrl}/${id}`)
      .pipe(
        timeout(10000), // 10 segundos de timeout
        catchError(this.handleError)
      );
  }
}
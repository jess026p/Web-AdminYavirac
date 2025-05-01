import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, tap, timeout, map } from 'rxjs';

export interface UsuarioSimple {
  id?: number;
  nombre: string;
  apellido: string;
  correo: string;
  password?: string;
}

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
  avatar?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private apiUrl = 'http://localhost:3000/api/v1/users';
  private rolesUrl = 'http://localhost:3000/api/v1/roles';

  constructor(private http: HttpClient) {}

  getApiUrl(): string {
    return this.apiUrl;
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Error en la petición HTTP:', error);
    let mensajeError = 'Error de conexión con el servidor.';

    if (error.status === 0) {
      mensajeError = 'No se puede conectar al servidor.';
    } else if (error.status === 404) {
      mensajeError = 'Endpoint no encontrado.';
    } else if (error.status === 500) {
      mensajeError = 'Error interno del servidor.';
    } else if (error.status === 401) {
      mensajeError = 'No autorizado. Vuelva a iniciar sesión.';
    }

    return throwError(() => new Error(mensajeError));
  }

  obtenerUsuarios(): Observable<Usuario[]> {
    return this.http.get<any>(this.apiUrl)
      .pipe(
        timeout(10000),
        map(res => res.data || res),
        catchError(this.handleError)
      );
  }

  obtenerUsuarioPorId(id: string | number): Observable<Usuario> {
    if (id === undefined) {
      return throwError(() => new Error('No se puede obtener un usuario sin ID'));
    }

    return this.http.get<any>(`${this.apiUrl}/${id}`)
      .pipe(
        timeout(10000),
        map(res => res.data || res),
        catchError(this.handleError)
      );
  }

  obtenerRoles(): Observable<Role[]> {
    return this.http.get<any>(this.rolesUrl)
      .pipe(
        timeout(10000),
        map(res => res.data || res),
        catchError(this.handleError)
      );
  }

  crearUsuario(usuario: Usuario): Observable<Usuario> {
    const usuarioParaEnviar = this.prepararDatosUsuario(usuario);

    return this.http.post<Usuario>(this.apiUrl, usuarioParaEnviar)  // ← Aquí corregido
      .pipe(
        timeout(10000),
        tap(response => console.log('Usuario creado:', response)),
        catchError(this.handleError)
      );
  }


  actualizarUsuario(usuario: Usuario): Observable<Usuario> {
    if (!usuario.id) {
      return throwError(() => new Error('ID de usuario requerido para actualizar'));
    }

    const usuarioParaEnviar = this.prepararDatosUsuario(usuario);

    return this.http.put<Usuario>(`${this.apiUrl}/${usuario.id}`, usuarioParaEnviar) // ✅ corregido
      .pipe(
        timeout(10000),
        tap(response => console.log('Usuario actualizado:', response)),
        catchError(this.handleError)
      );
  }

  eliminarUsuario(id: string | number): Observable<any> {
    if (id === undefined) {
      return throwError(() => new Error('No se puede eliminar un usuario sin ID'));
    }

    return this.http.delete(`${this.apiUrl}/${id}`)
      .pipe(
        timeout(10000),
        catchError(this.handleError)
      );
  }

  private prepararDatosUsuario(usuario: Usuario): any {
    const usuarioFormateado = { ...usuario };

    if (usuarioFormateado.roles && Array.isArray(usuarioFormateado.roles)) {
      usuarioFormateado.roles = usuarioFormateado.roles.map((rol: any) =>
        typeof rol === 'object' && rol !== null ? rol.id : rol
      );
    }

    if (usuarioFormateado.password === '') {
      delete usuarioFormateado.password;
    }

    return usuarioFormateado;
  }
}
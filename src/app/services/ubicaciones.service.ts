import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, tap, timeout, map } from 'rxjs';
import { Schedule } from './schedules.service';
import { environment } from '../../environments/environment';

export interface Site {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  employee_id: string;
  schedules?: Schedule[];
  created_at?: Date;
  updated_at?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class UbicacionesService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

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

  obtenerUbicaciones(): Observable<Site[]> {
    return this.http.get<any>(`${this.apiUrl}/ubicaciones`)
      .pipe(
        timeout(10000),
        map(res => res.data || res),
        catchError(this.handleError)
      );
  }

  obtenerUbicacionPorId(id: string): Observable<Site> {
    if (!id) {
      return throwError(() => new Error('No se puede obtener una ubicación sin ID'));
    }

    return this.http.get<any>(`${this.apiUrl}/ubicaciones/${id}`)
      .pipe(
        timeout(10000),
        map(res => res.data || res),
        catchError(this.handleError)
      );
  }

  obtenerUbicacionesPorEmpleado(employeeId: string): Observable<Site[]> {
    if (!employeeId) {
      return throwError(() => new Error('No se puede obtener ubicaciones sin ID de empleado'));
    }

    return this.http.get<any>(`${this.apiUrl}/ubicaciones/employee/${employeeId}`)
      .pipe(
        timeout(10000),
        map(res => res.data || res),
        catchError(this.handleError)
      );
  }

  crearUbicacion(ubicacion: Site): Observable<Site> {
    return this.http.post<Site>(`${this.apiUrl}/ubicaciones`, ubicacion)
      .pipe(
        timeout(10000),
        tap(response => console.log('Ubicación creada:', response)),
        catchError(this.handleError)
      );
  }

  actualizarUbicacion(ubicacion: Site): Observable<Site> {
    if (!ubicacion.id) {
      return throwError(() => new Error('ID de ubicación requerido para actualizar'));
    }

    return this.http.put<Site>(`${this.apiUrl}/ubicaciones/${ubicacion.id}`, ubicacion)
      .pipe(
        timeout(10000),
        tap(response => console.log('Ubicación actualizada:', response)),
        catchError(this.handleError)
      );
  }

  eliminarUbicacion(id: string): Observable<any> {
    if (!id) {
      return throwError(() => new Error('No se puede eliminar una ubicación sin ID'));
    }

    return this.http.delete(`${this.apiUrl}/ubicaciones/${id}`)
      .pipe(
        timeout(10000),
        catchError(this.handleError)
      );
  }

  // Métodos para gestionar la relación entre sitios y horarios
  asignarHorarioAUbicacion(siteId: string, scheduleId: string): Observable<any> {
    if (!siteId || !scheduleId) {
      return throwError(() => new Error('Se requieren los IDs de ubicación y horario'));
    }

    return this.http.post<any>(`${this.apiUrl}/ubicaciones/${siteId}/schedules/${scheduleId}`, {})
      .pipe(
        timeout(10000),
        tap(response => console.log('Horario asignado a ubicación:', response)),
        catchError(this.handleError)
      );
  }

  removerHorarioDeUbicacion(siteId: string, scheduleId: string): Observable<any> {
    if (!siteId || !scheduleId) {
      return throwError(() => new Error('Se requieren los IDs de ubicación y horario'));
    }

    return this.http.delete(`${this.apiUrl}/ubicaciones/${siteId}/schedules/${scheduleId}`)
      .pipe(
        timeout(10000),
        catchError(this.handleError)
      );
  }

  obtenerHorariosDeUbicacion(siteId: string): Observable<Schedule[]> {
    if (!siteId) {
      return throwError(() => new Error('Se requiere el ID de ubicación'));
    }

    return this.http.get<any>(`${this.apiUrl}/ubicaciones/${siteId}/schedules`)
      .pipe(
        timeout(10000),
        map(res => res.data || res),
        catchError(this.handleError)
      );
  }

  asignarUbicacionAUsuario(usuarioId: string, ubicacionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/ubicaciones/asignar`, { usuarioId, ubicacionId });
  }
} 
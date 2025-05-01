import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, tap, timeout, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Schedule {
  id?: string;
  shift_id: string;
  day_of_week: string;
  work_start_time: string;
  work_end_time: string;
  lunch_start_time?: string;
  lunch_end_time?: string;
  created_at?: Date;
  updated_at?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SchedulesService {
  private apiUrl = `${environment.apiUrl}/schedules`;
  private usarDatosLocales = true;

  private horariosLocales: { [key: string]: Schedule[] } = {
    '1': [ // Turno Mañana
      {
        id: '1',
        shift_id: '1',
        day_of_week: 'MONDAY',
        work_start_time: '08:00',
        work_end_time: '17:00',
        lunch_start_time: '13:00',
        lunch_end_time: '14:00'
      }
    ],
    '2': [ // Turno Tarde
      {
        id: '2',
        shift_id: '2',
        day_of_week: 'MONDAY',
        work_start_time: '14:00',
        work_end_time: '22:00',
        lunch_start_time: '18:00',
        lunch_end_time: '19:00'
      }
    ],
    '3': [ // Turno Noche
      {
        id: '3',
        shift_id: '3',
        day_of_week: 'MONDAY',
        work_start_time: '22:00',
        work_end_time: '06:00',
        lunch_start_time: '02:00',
        lunch_end_time: '03:00'
      }
    ]
  };

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

  obtenerHorarios(): Observable<Schedule[]> {
    return this.http.get<Schedule[]>(this.apiUrl)
      .pipe(
        timeout(10000),
        catchError(this.handleError)
      );
  }

  obtenerHorarioPorId(id: string): Observable<Schedule> {
    if (!id) {
      return throwError(() => new Error('No se puede obtener un horario sin ID'));
    }

    return this.http.get<Schedule>(`${this.apiUrl}/${id}`)
      .pipe(
        timeout(10000),
        catchError(this.handleError)
      );
  }

  obtenerHorariosPorTurno(shiftId: string): Observable<Schedule[]> {
    if (this.usarDatosLocales) {
      console.log('Usando datos locales para horarios del turno:', shiftId);
      return of(this.horariosLocales[shiftId] || []);
    }

    if (!shiftId) {
      return throwError(() => new Error('No se puede obtener horarios sin ID de turno'));
    }

    return this.http.get<Schedule[]>(`${this.apiUrl}/shift/${shiftId}`)
      .pipe(
        timeout(10000),
        catchError(this.handleError)
      );
  }

  obtenerHorariosPorUbicacion(ubicacionId: string): Observable<Schedule[]> {
    if (!ubicacionId) {
      return throwError(() => new Error('No se puede obtener horarios sin ID de ubicación'));
    }

    return this.http.get<Schedule[]>(`${this.apiUrl}/site/${ubicacionId}`)
      .pipe(
        timeout(10000),
        catchError(this.handleError)
      );
  }

  crearHorario(horario: Schedule): Observable<Schedule> {
    return this.http.post<Schedule>(this.apiUrl, horario)
      .pipe(
        timeout(10000),
        tap(response => console.log('Horario creado:', response)),
        catchError(this.handleError)
      );
  }

  actualizarHorario(horario: Schedule): Observable<Schedule> {
    if (!horario.id) {
      return throwError(() => new Error('ID de horario requerido para actualizar'));
    }

    return this.http.put<Schedule>(`${this.apiUrl}/${horario.id}`, horario)
      .pipe(
        timeout(10000),
        tap(response => console.log('Horario actualizado:', response)),
        catchError(this.handleError)
      );
  }

  eliminarHorario(id: string): Observable<any> {
    if (!id) {
      return throwError(() => new Error('No se puede eliminar un horario sin ID'));
    }

    return this.http.delete(`${this.apiUrl}/${id}`)
      .pipe(
        timeout(10000),
        catchError(this.handleError)
      );
  }
} 
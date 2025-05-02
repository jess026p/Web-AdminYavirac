import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, tap, timeout, map, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Shift {
  id?: string;
  name: string;
  description?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Horario {
  id?: string;
  dayOfWeek?: number;
  employeeId: string;
  hourStartedAt: number;
  hourEndedAt: number;
  minuteStartedAt: number;
  minuteEndedAt: number;
  minutesLunch: number;
  minutesTolerance: number;
  shiftType: string;
  jornadaId: string;
  days?: string[]; // Solo para uso en frontend
}

export interface Jornada {
  id: string;
  nombre: string;
  horaEntrada: string;
  horaSalida: string;
  descripcion: string;
}

@Injectable({
  providedIn: 'root'
})
export class ShiftsService {
  private sitesUrl = `${environment.apiUrl}/v1/sites`;
  private schedulesUrl = `${environment.apiUrl}/v1/schedules`;
  private usarDatosLocales = false; // Cambiamos a false para usar el backend real

  private turnosLocales: Shift[] = [
    { 
      id: '1', 
      name: 'Turno Mañana',
      description: 'Turno de la mañana (8:00 AM - 5:00 PM)'
    },
    { 
      id: '2', 
      name: 'Turno Tarde',
      description: 'Turno de la tarde (2:00 PM - 10:00 PM)'
    },
    { 
      id: '3', 
      name: 'Turno Noche',
      description: 'Turno de la noche (10:00 PM - 6:00 AM)'
    }
  ];

  jornadasPredefinidas: Jornada[] = [
    {
      id: '1',
      nombre: 'Jornada Matutina',
      horaEntrada: '07:00',
      horaSalida: '15:00',
      descripcion: 'Horario de mañana'
    },
    {
      id: '2',
      nombre: 'Jornada Vespertina',
      horaEntrada: '13:00',
      horaSalida: '21:00',
      descripcion: 'Horario de tarde'
    },
    {
      id: '3',
      nombre: 'Jornada Nocturna',
      horaEntrada: '21:00',
      horaSalida: '07:00',
      descripcion: 'Horario de noche'
    },
    {
      id: '4',
      nombre: 'Media Jornada Mañana',
      horaEntrada: '08:00',
      horaSalida: '12:00',
      descripcion: 'Medio tiempo mañana'
    },
    {
      id: '5',
      nombre: 'Media Jornada Tarde',
      horaEntrada: '14:00',
      horaSalida: '18:00',
      descripcion: 'Medio tiempo tarde'
    }
  ];

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

  obtenerTurnos(): Observable<Shift[]> {
    if (this.usarDatosLocales) {
      console.log('Usando datos locales para turnos');
      return of(this.turnosLocales);
    }

    return this.http.get<any>(this.sitesUrl)
      .pipe(
        timeout(10000),
        map(res => res.data || res),
        catchError(this.handleError)
      );
  }

  obtenerTurnoPorId(id: string): Observable<Shift> {
    if (this.usarDatosLocales) {
      const turno = this.turnosLocales.find(t => t.id === id);
      if (turno) {
        return of(turno);
      }
      return throwError(() => new Error('Turno no encontrado'));
    }

    if (!id) {
      return throwError(() => new Error('No se puede obtener un turno sin ID'));
    }

    return this.http.get<any>(`${this.sitesUrl}/${id}`)
      .pipe(
        timeout(10000),
        map(res => res.data || res),
        catchError(this.handleError)
      );
  }

  crearTurno(turno: Shift): Observable<Shift> {
    return this.http.post<Shift>(this.sitesUrl, turno)
      .pipe(
        timeout(10000),
        tap(response => console.log('Turno creado:', response)),
        catchError(this.handleError)
      );
  }

  actualizarTurno(turno: Shift): Observable<Shift> {
    if (!turno.id) {
      return throwError(() => new Error('ID de turno requerido para actualizar'));
    }

    return this.http.put<Shift>(`${this.sitesUrl}/${turno.id}`, turno)
      .pipe(
        timeout(10000),
        tap(response => console.log('Turno actualizado:', response)),
        catchError(this.handleError)
      );
  }

  eliminarTurno(id: string): Observable<any> {
    if (!id) {
      return throwError(() => new Error('No se puede eliminar un turno sin ID'));
    }

    return this.http.delete(`${this.sitesUrl}/${id}`)
      .pipe(
        timeout(10000),
        catchError(this.handleError)
      );
  }

  guardarHorario(horario: Horario): Observable<Horario> {
    return this.http.post<Horario>(this.schedulesUrl, horario).pipe(
      timeout(10000),
      tap(response => console.log('Horario guardado:', response)),
      catchError(this.handleError)
    );
  }

  obtenerHorarios(employeeId: string): Observable<Horario[]> {
    return this.http.get<Horario[]>(`${this.schedulesUrl}?employee_id=${employeeId}`).pipe(
      timeout(10000),
      catchError(this.handleError)
    );
  }

  eliminarHorario(id: string): Observable<void> {
    return this.http.delete<void>(`${this.schedulesUrl}/${id}`).pipe(
      timeout(10000),
      catchError(this.handleError)
    );
  }

  // Métodos para ubicaciones
  guardarUbicacion(ubicacion: any): Observable<any> {
    return this.http.post(this.sitesUrl, ubicacion).pipe(
      timeout(10000),
      tap(response => console.log('Ubicación guardada:', response)),
      catchError(this.handleError)
    );
  }

  obtenerUbicaciones(): Observable<any[]> {
    return this.http.get<any[]>(this.sitesUrl).pipe(
      timeout(10000),
      catchError(this.handleError)
    );
  }

  eliminarUbicacion(id: string): Observable<void> {
    return this.http.delete<void>(`${this.sitesUrl}/${id}`).pipe(
      timeout(10000),
      catchError(this.handleError)
    );
  }
} 
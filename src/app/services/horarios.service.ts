import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface Horario {
  id?: string;
  jornadaId: string;
  dias: number[];
  horaInicio: string;
  horaFin: string;
  horaAlmuerzoSalida?: string;
  horaAlmuerzoRegreso?: string;
  minutosAlmuerzo?: number;
  tolerancia?: number;
}

@Injectable({
  providedIn: 'root'
})
export class HorariosService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  crearHorario(horario: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/horarios`, horario);
  }

  obtenerHorarios(): Observable<any> {
    return this.http.get(`${this.apiUrl}/horarios`);
  }

  obtenerHorarioPorId(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/horarios/${id}`);
  }

  actualizarHorario(id: string, horario: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/horarios/${id}`, horario);
  }

  eliminarHorario(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/horarios/${id}`);
  }

  asignarHorarioAUsuario(usuarioId: string, horarioId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/horarios/asignar`, { usuarioId, horarioId });
  }

  getHorarios(): Observable<Horario[]> {
    return this.http.get<Horario[]>(`${this.apiUrl}/horarios`);
  }

  createHorario(horario: Horario): Observable<Horario> {
    return this.http.post<Horario>(`${this.apiUrl}/horarios`, horario);
  }

  updateHorario(id: string, horario: Horario): Observable<Horario> {
    return this.http.put<Horario>(`${this.apiUrl}/horarios/${id}`, horario);
  }

  deleteHorario(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/horarios/${id}`);
  }
} 
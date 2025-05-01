import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

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
} 
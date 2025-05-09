import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Profile {
  id: string;
  username: string;
  name: string;
  lastname: string;
  email: string;
  identification: string;
  identificationType?: string;
  roles?: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  avatar?: string;
  gender?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = `${environment.apiUrl}/users/profile`;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<Profile> {
    return this.http.get<Profile>(this.apiUrl)
      .pipe(
        catchError(this.handleError)
      );
  }

  updateProfile(profile: Partial<Profile>): Observable<Profile> {
    return this.http.put<Profile>(this.apiUrl, profile)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: any) {
    console.error('Error en el servicio de perfil:', error);
    return throwError(() => new Error(error.message || 'Error al obtener/actualizar el perfil'));
  }
} 
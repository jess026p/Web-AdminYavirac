import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, tap, throwError, BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthResponse {
  data: {
    accessToken: string;
    auth: any;
  };
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/v1/auth';
  private isAuthenticated = new BehaviorSubject<boolean>(this.checkToken());
  private userSubject = new BehaviorSubject<any>(this.getUserData());
  user$ = this.userSubject.asObservable();
  
  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  private handleError(error: HttpErrorResponse) {
    console.error('Error en la petición HTTP:', error);
    let mensajeError = 'Error de conexión con el servidor.';
    
    if (error.status === 0) {
      mensajeError = 'No se puede conectar al servidor. Verifica que el backend esté en ejecución.';
    } else if (error.status === 401) {
      mensajeError = 'Credenciales inválidas.';
    } else if (error.status === 403) {
      mensajeError = 'No tienes permisos para realizar esta acción.';
    } else if (error.status === 404) {
      mensajeError = 'Recurso no encontrado.';
    } else if (error.error && error.error.message) {
      mensajeError = error.error.message;
    }
    
    return throwError(() => new Error(mensajeError));
  }

  login(data: LoginData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data)
      .pipe(
        tap(response => {
          if (response.data && response.data.accessToken) {
            this.setToken(response.data.accessToken);
            this.setUserData(response.data.auth);
            this.userSubject.next(response.data.auth);
            this.isAuthenticated.next(true);
          }
        }),
        catchError(this.handleError)
      );
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    this.userSubject.next(null);
    this.isAuthenticated.next(false);
    this.router.navigate(['/login']);
  }

  getIsAuthenticated(): Observable<boolean> {
    return this.isAuthenticated.asObservable();
  }

  checkAuthenticated(): boolean {
    return this.checkToken();
  }

  private checkToken(): boolean {
    const token = localStorage.getItem('accessToken');
    return !!token;
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private setToken(token: string): void {
    localStorage.setItem('accessToken', token);
  }

  private setUserData(user: any): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUserData(): any {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  }
}

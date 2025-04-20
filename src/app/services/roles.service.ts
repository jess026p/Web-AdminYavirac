import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, lastValueFrom, firstValueFrom } from 'rxjs';

export interface Role {
  id: string;
  name: string;
  code: string;
}

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private apiUrl = 'http://localhost:3000/api/v1/roles';

  // Datos locales para desarrollo
  private rolesLocales: Role[] = [
    { id: '1', name: 'Administrador', code: 'admin' },
    { id: '2', name: 'Empleado', code: 'employee' },
    { id: '3', name: 'Supervisor', code: 'supervisor' }
  ];

  // Conmutador para usar datos locales o API
  private usarDatosLocales = true;

  constructor(private http: HttpClient) {}

  // Versión actualizada que devuelve una Promesa sin usar toPromise()
  async obtenerRoles(): Promise<Role[]> {
    if (this.usarDatosLocales) {
      console.log('Usando datos locales para roles');
      return Promise.resolve([...this.rolesLocales]);
    }
    
    console.log('Conectando con el backend para obtener roles');
    try {
      const response = await firstValueFrom(
        this.http.get<any>(this.apiUrl).pipe(
          catchError(this.handleError)
        )
      );
      
      // Adaptar según la estructura de respuesta del backend
      if (response && response.data) {
        return response.data;
      }
      return response;
    } catch (error) {
      console.error('Error al obtener roles:', error);
      throw error;
    }
  }

  // Versión alternativa que devuelve un Observable
  obtenerRolesObservable(): Observable<Role[]> {
    if (this.usarDatosLocales) {
      return new Observable<Role[]>(observer => {
        observer.next([...this.rolesLocales]);
        observer.complete();
      });
    }
    
    return this.http.get<any>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    console.error('Error en RolesService:', error);
    let errorMsg = 'Error al procesar la solicitud';
    
    if (error.error instanceof ErrorEvent) {
      // Error del cliente
      errorMsg = `Error: ${error.error.message}`;
    } else {
      // Error del servidor
      errorMsg = `Código: ${error.status}, Mensaje: ${error.message}`;
    }
    
    return throwError(() => new Error(errorMsg));
  }
} 
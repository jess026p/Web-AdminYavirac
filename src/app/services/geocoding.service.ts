import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private apiUrl = `${environment.apiUrl}/geocoding`;

  constructor(private http: HttpClient) {}

  // Obtener dirección a partir de coordenadas
  reverseGeocode(lat: number, lon: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/reverse?lat=${lat}&lon=${lon}`);
  }

  // Buscar dirección y obtener coordenadas
  searchAddress(query: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`);
  }
} 
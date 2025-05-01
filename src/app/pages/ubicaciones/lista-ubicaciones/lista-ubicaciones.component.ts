import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonButton,
  IonIcon
} from '@ionic/angular/standalone';
import { UbicacionesService, Site } from '../../../services/ubicaciones.service';
import { SchedulesService, Schedule } from '../../../services/schedules.service';
import { addIcons } from 'ionicons';
import { trashOutline } from 'ionicons/icons';

@Component({
  selector: 'app-lista-ubicaciones',
  template: `
    <ion-card>
      <ion-card-header>
        <ion-card-title>Ubicaciones guardadas</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-list>
          <ion-item *ngFor="let ubicacion of ubicaciones">
            <ion-label>
              <h2>{{ ubicacion.name || 'Sin nombre' }}</h2>
              <p><small>
                Lat: {{ ubicacion.latitude || 0 }}, 
                Lon: {{ ubicacion.longitude || 0 }}
              </small></p>
              <p><small>Radio: {{ ubicacion.radius || 0 }} metros</small></p>
              <ion-badge *ngIf="getSchedulesLength(ubicacion)">
                {{ getSchedulesLength(ubicacion) }} horarios
              </ion-badge>
            </ion-label>
            <ion-button 
              slot="end" 
              fill="clear" 
              color="danger" 
              (click)="eliminarUbicacion(ubicacion.id)"
              [disabled]="!ubicacion.id">
              <ion-icon name="trash-outline"></ion-icon>
            </ion-button>
          </ion-item>
        </ion-list>
      </ion-card-content>
    </ion-card>
  `,
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonButton,
    IonIcon
  ]
})
export class ListaUbicacionesComponent implements OnInit {
  ubicaciones: Site[] = [];

  constructor(
    private ubicacionesService: UbicacionesService,
    private schedulesService: SchedulesService
  ) {
    addIcons({ trashOutline });
  }

  ngOnInit() {
    this.cargarUbicaciones();
  }

  getSchedulesLength(ubicacion: Site): number {
    return ubicacion.schedules?.length || 0;
  }

  async cargarUbicaciones() {
    try {
      this.ubicaciones = await this.ubicacionesService.obtenerUbicaciones().toPromise() || [];
      
      // Cargar los horarios para cada ubicación
      for (const ubicacion of this.ubicaciones) {
        if (ubicacion.id) {
          const schedules = await this.schedulesService.obtenerHorariosPorUbicacion(ubicacion.id).toPromise();
          ubicacion.schedules = schedules || [];
        }
      }
    } catch (error) {
      console.error('Error al cargar ubicaciones:', error);
    }
  }

  async eliminarUbicacion(id?: string) {
    if (!id) return;
    
    try {
      await this.ubicacionesService.eliminarUbicacion(id).toPromise();
      this.ubicaciones = this.ubicaciones.filter(u => u.id !== id);
    } catch (error) {
      console.error('Error al eliminar ubicación:', error);
    }
  }
} 
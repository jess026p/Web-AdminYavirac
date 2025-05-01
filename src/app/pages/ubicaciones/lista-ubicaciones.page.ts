import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonList,
  IonItem, 
  IonLabel,
  IonButton, 
  IonIcon, 
  IonCard, 
  IonCardContent, 
  IonToast, 
  IonLoading, 
  IonSearchbar,
  IonButtons,
  IonBackButton,
  IonChip
} from '@ionic/angular/standalone';
import { UbicacionesService, Site } from '../../services/ubicaciones.service';
import { SchedulesService } from '../../services/schedules.service';
import { UsuariosService, Usuario } from '../../services/usuarios.service';
import { addIcons } from 'ionicons';
import { trashOutline, createOutline, locationOutline } from 'ionicons/icons';

@Component({
  selector: 'app-lista-ubicaciones',
  templateUrl: './lista-ubicaciones.page.html',
  styleUrls: ['./lista-ubicaciones.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonCard,
    IonCardContent,
    IonToast,
    IonLoading,
    IonSearchbar,
    IonButtons,
    IonBackButton,
    IonChip
  ]
})
export class ListaUbicacionesPage implements OnInit {
  ubicaciones: Site[] = [];
  ubicacionesFiltradas: Site[] = [];
  usuarios: Usuario[] = [];
  terminoBusqueda: string = '';
  
  // Mensajes de toast
  mensajeToast: string = '';
  mostrarToast: boolean = false;
  colorToast: string = 'success';
  
  // Estado de carga
  cargando: boolean = false;

  constructor(
    private ubicacionesService: UbicacionesService,
    private schedulesService: SchedulesService,
    private usuariosService: UsuariosService
  ) {
    addIcons({ trashOutline, createOutline, locationOutline });
  }

  async ngOnInit() {
    await this.cargarDatos();
  }

  async cargarDatos() {
    this.cargando = true;
    try {
      this.ubicaciones = await this.ubicacionesService.obtenerUbicaciones().toPromise() || [];
      this.usuarios = await this.usuariosService.obtenerUsuarios().toPromise() || [];
      
      // Cargar los horarios para cada ubicación
      for (const ubicacion of this.ubicaciones) {
        if (ubicacion.id) {
          const schedules = await this.schedulesService.obtenerHorariosPorUbicacion(ubicacion.id).toPromise();
          ubicacion.schedules = schedules || [];
        }
      }
      
      this.aplicarFiltros();
    } catch (error) {
      console.error('Error al cargar datos:', error);
      this.mostrarMensaje('Error al cargar los datos', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  aplicarFiltros() {
    if (!this.terminoBusqueda.trim()) {
      this.ubicacionesFiltradas = [...this.ubicaciones];
      return;
    }

    const termino = this.terminoBusqueda.toLowerCase();
    this.ubicacionesFiltradas = this.ubicaciones.filter(ubicacion => 
      ubicacion.name.toLowerCase().includes(termino)
    );
  }

  async eliminarUbicacion(id: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta ubicación?')) {
      return;
    }

    try {
      await this.ubicacionesService.eliminarUbicacion(id).toPromise();
      this.ubicaciones = this.ubicaciones.filter(u => u.id !== id);
      this.ubicacionesFiltradas = this.ubicacionesFiltradas.filter(u => u.id !== id);
      this.mostrarMensaje('Ubicación eliminada correctamente', 'success');
    } catch (error) {
      console.error('Error al eliminar ubicación:', error);
      this.mostrarMensaje('Error al eliminar la ubicación', 'danger');
    }
  }

  editarUbicacion(id: string) {
    // Implementar navegación a la página de edición
    console.log('Editar ubicación:', id);
  }

  verEnMapa(ubicacion: Site) {
    // Implementar navegación a la página de mapa con la ubicación seleccionada
    console.log('Ver en mapa:', ubicacion);
  }

  mostrarMensaje(mensaje: string, color: string = 'success') {
    this.mensajeToast = mensaje;
    this.colorToast = color;
    this.mostrarToast = true;
  }
} 
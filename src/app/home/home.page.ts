// ✅ home.page.ts - Lógica completa para buscar por identificación/nombre/apellido con historial y mapa

import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { UsuariosService } from '../services/usuarios.service';
import { firstValueFrom } from 'rxjs';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  busqueda: string = '';
  usuario: any = {
    nombre: '',
    diasLaborados: 0,
    faltas: 0,
    atrasos: 0,
    registros: []
  };
  usuariosEncontrados: any[] = [];
  mostrarSeleccion: boolean = false;
  buscando: boolean = false;
  timeout: any;
  fechaActual: string = new Date().toLocaleDateString();
  mostrarHistorial: boolean = false;
  historialRegistros: any[] = [];
  usuarios: any[] = [];
  usuarioSeleccionado: any = null;
  mostrarModalAsistencia: boolean = false;
  resumenAsistencia: any = null;
  mostrarModalHorarios: boolean = false;
  horariosUsuario: any[] = [];
  filtroBusqueda: string = '';
  usuariosFiltrados: any[] = [];
  mesActual: string = '';
  mesSeleccionado: number = new Date().getMonth() + 1;
  anioSeleccionado: number = new Date().getFullYear();
  diasNombre: any = {
    0: 'Domingo',
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
    'Domingo': 'Domingo',
    'Lunes': 'Lunes',
    'Martes': 'Martes',
    'Miércoles': 'Miércoles',
    'Jueves': 'Jueves',
    'Viernes': 'Viernes',
    'Sábado': 'Sábado'
  };

  constructor(
    private http: HttpClient, 
    private router: Router,
    private userService: UsuariosService,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.setMesActual();
    this.cargarUsuarios();
  }

  setMesActual() {
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const fecha = new Date();
    this.mesActual = meses[fecha.getMonth()];
  }

  cargarUsuarios() {
    this.userService.obtenerUsuarios().subscribe((usuarios: any[]) => {
      this.usuarios = usuarios;
      this.filtrarUsuarios();
    });
  }

  filtrarUsuarios() {
    const termino = this.filtroBusqueda.trim().toLowerCase();
    if (!termino) {
      this.usuariosFiltrados = this.usuarios;
      return;
    }
    this.usuariosFiltrados = this.usuarios.filter((u: any) =>
      (u.nombre && u.nombre.toLowerCase().includes(termino)) ||
      (u.apellido && u.apellido.toLowerCase().includes(termino)) ||
      (u.name && u.name.toLowerCase().includes(termino)) ||
      (u.lastname && u.lastname.toLowerCase().includes(termino)) ||
      (u.cedula && u.cedula.includes(termino)) ||
      (u.identification && u.identification.includes(termino))
    );
  }

  async verAsistencia(usuario: any) {
    try {
      const res = await firstValueFrom(
        this.http.get<any>(`http://localhost:3000/api/v1/asistencias/resumen/${usuario.id}?mes=${this.mesSeleccionado}&anio=${this.anioSeleccionado}`)
      );
      this.resumenAsistencia = res.data;
      this.usuarioSeleccionado = usuario;
      this.mostrarModalAsistencia = true;
    } catch (error) {
      alert('No se pudo cargar el resumen de asistencia');
    }
  }

  async verHorarios(usuario: any) {
    try {
      this.horariosUsuario = [];
      const res = await firstValueFrom(
        this.http.get<any>(`http://localhost:3000/api/v1/horarios/user/${usuario.id}/locations`)
      );
      this.horariosUsuario = res.data || res;
      this.usuarioSeleccionado = usuario;
      this.mostrarModalHorarios = true;
    } catch (error) {
      alert('No se pudo cargar los horarios');
    }
  }

  cerrarModalAsistencia() {
    this.mostrarModalAsistencia = false;
    this.resumenAsistencia = null;
    this.usuarioSeleccionado = null;
    this.historialRegistros = [];
  }

  cerrarModalHorarios() {
    this.mostrarModalHorarios = false;
    this.horariosUsuario = [];
    this.usuarioSeleccionado = null;
  }

  editarHorario(horario: any) {
    const userId = this.usuarioSeleccionado?.id || horario.userId;
    this.cerrarModalHorarios();
    setTimeout(() => {
      this.router.navigateByUrl('/layout/horarios?userId=' + userId + '&horarioId=' + horario.id);
    }, 100);
  }

  async verHistorial() {
    if (!this.usuarioSeleccionado?.id) {
      alert('No se puede mostrar el historial: usuario sin ID');
      return;
    }
    this.mostrarHistorial = !this.mostrarHistorial;
    if (this.mostrarHistorial && this.historialRegistros.length === 0) {
      try {
        const res = await firstValueFrom(
          this.http.get<any>(`http://localhost:3000/api/v1/asistencias/historial/${this.usuarioSeleccionado.id}?mes=${this.mesSeleccionado}&anio=${this.anioSeleccionado}`)
        );
        this.historialRegistros = res.data || [];
        for (const registro of this.historialRegistros) {
          if (registro.lat_entrada && registro.lng_entrada) {
            registro.direccion_entrada = await this.obtenerDireccion(registro.lat_entrada, registro.lng_entrada);
          }
          if (registro.lat_salida && registro.lng_salida) {
            registro.direccion_salida = await this.obtenerDireccion(registro.lat_salida, registro.lng_salida);
          }
        }
      } catch (error) {
        alert('No se pudo cargar el historial');
        this.historialRegistros = [];
      }
    }
  }

  async buscarYMostrarResumen(termino: string) {
    try {
      this.buscando = true;
      const usuarios = await firstValueFrom(
        this.http.get<any>(`http://localhost:3000/api/v1/users?search=${termino}`)
      );
      const listaUsuarios = usuarios.data || usuarios;

      // Filtro adicional en frontend
      const terminoLower = termino.toLowerCase();
      const listaFiltrada = listaUsuarios.filter((u: any) =>
        (u.name && u.name.toLowerCase().includes(terminoLower)) ||
        (u.lastname && u.lastname.toLowerCase().includes(terminoLower)) ||
        (u.identification && u.identification.includes(termino)) ||
        (u.email && u.email.toLowerCase().includes(terminoLower))
      );

      if (!listaFiltrada.length) {
        alert('Usuario no encontrado');
        this.mostrarSeleccion = false;
        this.usuariosEncontrados = [];
        this.buscando = false;
        return;
      }

      if (listaFiltrada.length === 1) {
        this.obtenerResumenAsistencia(listaFiltrada[0].id);
        this.mostrarSeleccion = false;
        this.usuariosEncontrados = [];
      } else {
        this.usuariosEncontrados = listaFiltrada;
        this.mostrarSeleccion = true;
      }
      this.buscando = false;
    } catch (error) {
      console.error('Error al buscar usuarios:', error);
      alert('Error al buscar el usuario');
      this.buscando = false;
    }
  }

  async obtenerResumenAsistencia(userId: string) {
    try {
      this.buscando = true;
      const resumen = await firstValueFrom(
        this.http.get<any>(`http://localhost:3000/api/v1/asistencias/resumen/${userId}`)
      );
      this.usuario = resumen.data;
      this.mostrarSeleccion = false;
      this.usuariosEncontrados = [];
      this.buscando = false;
    } catch (error) {
      console.error('Error al obtener resumen:', error);
      alert('Error al obtener el resumen de asistencia');
      this.buscando = false;
    }
  }

  buscarUsuario() {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      if (!this.busqueda.trim()) return;
      this.buscarYMostrarResumen(this.busqueda);
    }, 700);
  }

  abrirMapa(ubicacion: any) {
    if (ubicacion && ubicacion.lat && ubicacion.lng) {
      window.open(`https://www.google.com/maps?q=${ubicacion.lat},${ubicacion.lng}`, '_blank');
    } else {
      alert('No hay ubicación registrada.');
    }
  }

  async obtenerDireccion(lat: number, lng: number): Promise<string> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
      const res: any = await firstValueFrom(this.http.get(url));
      return res.display_name || 'Dirección no encontrada';
    } catch (e) {
      return 'Dirección no encontrada';
    }
  }

  onFiltroMesAnioChange() {
    this.verAsistencia(this.usuarioSeleccionado);
    if (this.mostrarHistorial) {
      this.verHistorial();
    }
  }

  getDiasTexto(dias: any): string {
    if (Array.isArray(dias)) {
      return dias.map((d: any) => this.diasNombre[d] || d).join(', ');
    }
    return this.diasNombre[dias] || dias || '-';
  }
}

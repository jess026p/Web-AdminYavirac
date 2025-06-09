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
  alertaEliminarHorarioAbierta: boolean = false;
  horarioAEliminar: any = null;
  botonesAlertaEliminarHorario = [
    {
      text: 'Cancelar',
      role: 'cancel',
      handler: () => {
        this.alertaEliminarHorarioAbierta = false;
      }
    },
    {
      text: 'Eliminar',
      role: 'destructive',
      handler: () => {
        this.eliminarHorarioSeleccionado();
      }
    }
  ];
  mesResumen: number = 0;
  anioResumen: number = 0;
  alertaSinHorarioAbierta: boolean = false;
  mensajeAlertaSinHorario: string = '';
  botonesAlertaSinHorario = [
    {
      text: 'Entendido',
      role: 'cancel',
      handler: () => {
        this.alertaSinHorarioAbierta = false;
      }
    }
  ];

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
      this.usuarios = usuarios.sort((a, b) => {
        const nombreA = (a.name || '').toLowerCase();
        const nombreB = (b.name || '').toLowerCase();
        if (nombreA < nombreB) return -1;
        if (nombreA > nombreB) return 1;
        return 0;
      });
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

  // Devuelve el horario asignado para una fecha y hora específica
  getHorarioParaFechaYHora(fechaStr: string, horaStr: string): any {
    if (!this.horariosUsuario || this.horariosUsuario.length === 0) return null;
    const fecha = new Date(fechaStr);
    const diaSemana = fecha.getDay();
    // Convertir hora a minutos para comparar
    const [h, m, s] = horaStr.split(':').map(Number);
    const minutosMarcacion = h * 60 + m;
    return this.horariosUsuario.find(horario => {
      // Verificar fecha
      let fechaEnRango = true;
      if (horario.fechaInicio && horario.fechaFinRepeticion) {
        const inicio = new Date(horario.fechaInicio);
        const fin = new Date(horario.fechaFinRepeticion);
        fechaEnRango = fecha >= inicio && fecha <= fin;
      }
      // Verificar día de la semana
      let diaEnRango = true;
      if (Array.isArray(horario.dias)) {
        diaEnRango = horario.dias.includes(diaSemana);
      }
      // Verificar hora
      let horaEnRango = true;
      if (horario.horaInicio && horario.horaFin) {
        const [hi, mi] = horario.horaInicio.split(':').map(Number);
        const [hf, mf] = horario.horaFin.split(':').map(Number);
        const minInicio = hi * 60 + mi;
        const minFin = hf * 60 + mf;
        horaEnRango = minutosMarcacion >= minInicio && minutosMarcacion <= minFin;
      }
      return fechaEnRango && diaEnRango && horaEnRango;
    });
  }

  // Devuelve el horario asignado para una fecha específica (sin hora)
  getHorarioParaFecha(fechaStr: string): any {
    if (!this.horariosUsuario || this.horariosUsuario.length === 0) return null;
    const fecha = new Date(fechaStr);
    const diaSemana = fecha.getDay();
    return this.horariosUsuario.find(horario => {
      // Verificar fecha
      let fechaEnRango = true;
      if (horario.fechaInicio && horario.fechaFinRepeticion) {
        const inicio = new Date(horario.fechaInicio);
        const fin = new Date(horario.fechaFinRepeticion);
        fechaEnRango = fecha >= inicio && fecha <= fin;
      }
      // Verificar día de la semana
      let diaEnRango = true;
      if (Array.isArray(horario.dias)) {
        diaEnRango = horario.dias.includes(diaSemana);
      }
      return fechaEnRango && diaEnRango;
    });
  }

  async verAsistencia(usuario: any) {
    try {
      if (!this.horariosUsuario || this.horariosUsuario.length === 0) {
        const horariosRes = await firstValueFrom(
          this.http.get<any>(`http://localhost:3000/api/v1/horarios/user/${usuario.id}/locations`)
        );
        this.horariosUsuario = horariosRes.data || horariosRes;
      }
      // Log para depuración del mes y año enviados
      console.log('Mes enviado al backend:', this.mesSeleccionado, 'Año:', this.anioSeleccionado);
      const res = await firstValueFrom(
        this.http.get<any>(`http://localhost:3000/api/v1/asistencias/resumen/${usuario.id}?mes=${this.mesSeleccionado}&anio=${this.anioSeleccionado}`)
      );
      // Filtrar solo los horarios vigentes hoy
      const hoy = new Date();
      const fechaHoy = hoy.toISOString().slice(0, 10);
      res.data.registro_hoy = res.data.registro_hoy.filter((registro: any) => {
        if (!registro.fechaInicio || !registro.fechaFinRepeticion) return true; // Si faltan datos, mostrar por defecto
        const inicio = new Date(registro.fechaInicio);
        const fin = new Date(registro.fechaFinRepeticion);
        // Solo mostrar si hoy está en el rango [inicio, fin]
        return hoy >= inicio && hoy <= fin;
      });
      res.data.registro_hoy = res.data.registro_hoy.sort((a: any, b: any) => {
        if (!a.horario || !b.horario) return 0;
        // Extraer la hora de inicio (antes del guion)
        const horaA = a.horario.split('-')[0].trim();
        const horaB = b.horario.split('-')[0].trim();
        return horaA.localeCompare(horaB);
      });
      // Validación de horarios pasados sin marcación
      const horaActualMin = hoy.getHours() * 60 + hoy.getMinutes();
      res.data.registro_hoy.forEach((registro: any) => {
        if (!registro.horario || registro.horario === '-') return;
        // Extraer hora de fin del string "hh:mm:ss - hh:mm:ss"
        const partes = registro.horario.split('-');
        if (partes.length < 2) return;
        const horaFinStr = partes[1].trim();
        const [hf, mf, sf] = horaFinStr.split(':').map(Number);
        const minFin = hf * 60 + mf;
        // Si la hora de fin ya pasó y no hay marcación
        if ((!registro.estado_entrada || registro.estado_entrada === '-' || registro.estado_entrada === null)
          && minFin < horaActualMin) {
          registro.estado_entrada = 'Horario sin marcar';
          registro.motivo_entrada = 'Falta injustificada';
        }
      });
      this.resumenAsistencia = res.data;
      // Guardar el mes y año realmente calculados por el backend (si existen)
      this.mesResumen = res.data.mes_calculado || this.mesSeleccionado;
      this.anioResumen = res.data.anio_calculado || this.anioSeleccionado;
      this.usuarioSeleccionado = usuario;
      this.mostrarModalAsistencia = true;
    } catch (error: any) {
      const mensaje = error?.error?.message || 'No se pudo cargar el resumen de asistencia';
      this.mensajeAlertaSinHorario = mensaje;
      this.alertaSinHorarioAbierta = true;
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
    } catch (error: any) {
      const mensaje = error?.error?.message || 'No se pudo cargar los horarios';
      this.mensajeAlertaSinHorario = mensaje;
      this.alertaSinHorarioAbierta = true;
    }
  }

  cerrarModalAsistencia() {
    this.mostrarModalAsistencia = false;
    this.resumenAsistencia = null;
    this.usuarioSeleccionado = null;
    this.historialRegistros = [];
    // Restablecer filtros al mes y año actual
    const hoy = new Date();
    this.mesSeleccionado = hoy.getMonth() + 1;
    this.anioSeleccionado = hoy.getFullYear();
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
      this.mensajeAlertaSinHorario = 'No se puede mostrar el historial: usuario sin ID';
      this.alertaSinHorarioAbierta = true;
      return;
    }
    this.mostrarHistorial = !this.mostrarHistorial;
    if (this.mostrarHistorial && this.historialRegistros.length === 0) {
      try {
        if (!this.horariosUsuario || this.horariosUsuario.length === 0) {
          const horariosRes = await firstValueFrom(
            this.http.get<any>(`http://localhost:3000/api/v1/horarios/user/${this.usuarioSeleccionado.id}/locations`)
          );
          this.horariosUsuario = horariosRes.data || horariosRes;
        }
        const hoy = new Date();
        const mesActual = hoy.getMonth() + 1;
        const anioActual = hoy.getFullYear();
        const mesFiltro = this.mesSeleccionado;
        const anioFiltro = this.anioSeleccionado;
        const res = await firstValueFrom(
          this.http.get<any>(`http://localhost:3000/api/v1/asistencias/historial/${this.usuarioSeleccionado.id}?mes=${mesFiltro}&anio=${anioFiltro}`)
        );
        let registros = Array.isArray(res.data) ? res.data : [];
        // Si el filtro es el mes actual y año actual, y no se ha aplicado filtro manual, filtra hasta hoy
        const filtroManual = this.filtroBusqueda && this.filtroBusqueda.trim().length > 0;
        if (!filtroManual && mesFiltro === mesActual && anioFiltro === anioActual) {
          const hoyStr = hoy.toISOString().slice(0, 10);
          registros = registros.filter((r: any) => r.fecha <= hoyStr);
        }
        this.historialRegistros = registros;
        for (const registro of this.historialRegistros) {
          let horario = null;
          // Buscar horario por fecha y hora de entrada
          if (registro.fecha && registro.hora_entrada) {
            horario = this.getHorarioParaFechaYHora(registro.fecha, registro.hora_entrada);
          }
          // Si no, buscar por hora de salida
          if (!horario && registro.fecha && registro.hora_salida) {
            horario = this.getHorarioParaFechaYHora(registro.fecha, registro.hora_salida);
          }
          // Si no, buscar por fecha solamente
          if (!horario && registro.fecha) {
            horario = this.getHorarioParaFecha(registro.fecha);
          }
          if (horario) {
            registro.horario_rango = `${horario.horaInicio} - ${horario.horaFin}`;
          } else {
            registro.horario_rango = '-';
          }
          if (registro.lat_entrada && registro.lng_entrada) {
            registro.direccion_entrada = await this.obtenerDireccion(registro.lat_entrada, registro.lng_entrada);
          }
          if (registro.lat_salida && registro.lng_salida) {
            registro.direccion_salida = await this.obtenerDireccion(registro.lat_salida, registro.lng_salida);
          }
        }
        if (this.historialRegistros.length === 0) {
          // Mostrar mensaje visual si no hay registros
          this.mensajeAlertaSinHorario = 'No hay registros de asistencia para el período seleccionado';
          this.alertaSinHorarioAbierta = true;
        }
      } catch (error) {
        this.mensajeAlertaSinHorario = 'No se pudo cargar el historial';
        this.alertaSinHorarioAbierta = true;
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

  onFiltroMesAnioModalChange() {
    this.historialRegistros = [];
    if (this.usuarioSeleccionado) {
      this.verAsistencia(this.usuarioSeleccionado);
      if (this.mostrarHistorial) {
        this.verHistorial();
      }
    }
  }

  getDiasTexto(dias: any): string {
    if (Array.isArray(dias)) {
      return dias.map((d: any) => this.diasNombre[d] || d).join(', ');
    }
    return this.diasNombre[dias] || dias || '-';
  }

  confirmarEliminarHorario(horario: any) {
    this.horarioAEliminar = horario;
    this.alertaEliminarHorarioAbierta = true;
  }

  async eliminarHorarioSeleccionado() {
    if (!this.horarioAEliminar) return;
    try {
      await firstValueFrom(this.http.delete<any>(`http://localhost:3000/api/v1/horarios/${this.horarioAEliminar.id}`));
      // Eliminar del array local para refrescar la vista
      this.horariosUsuario = this.horariosUsuario.filter(h => h.id !== this.horarioAEliminar.id);
    } catch (error) {
      alert('No se pudo eliminar el horario');
    }
    this.alertaEliminarHorarioAbierta = false;
    this.horarioAEliminar = null;
  }
}

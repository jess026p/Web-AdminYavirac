import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { HorariosService, Horario } from '../../services/horarios.service';
import { UsuariosService, Usuario } from '../../services/usuarios.service';
import { IonicModule, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Icon, Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';
import { Circle as OlCircle } from 'ol/geom';
import { UserFilterPipe } from './user-filter.pipe';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { IonInput } from '@ionic/angular';

@Component({
  selector: 'app-horarios',
  templateUrl: './horarios.page.html',
  styleUrls: ['./horarios.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, UserFilterPipe]
})
export class HorariosPage implements OnInit {
  horarios: Horario[] = [];
  filtroUsuario: string = '';

  // Wizard paso a paso
  paso: number = 1;

  usuarios: any[] = [];
  usuarioSeleccionado: string = '';
  usuarioSeleccionadoObj: any = null;
  ubicaciones: any[] = [];
  ubicacionSeleccionada: { lat: number, lng: number } | null = null;
  ubicacionNombre: string = '';
  jornadaSeleccionada: string = '';
  diasSeleccionados: number[] = [];
  fechaInicio: string = '';
  horaInicio: string = '';
  horaFin: string = '';
  horasMinimas: string = '';
  repetirTurno: boolean = false;
  diasRepetir: number[] = [];
  fechaFinRepeticion: string = '';
  nombreTurno: string = '';
  horaAlmuerzoSalida: string = '';
  horaAlmuerzoRegreso: string = '';
  busquedaDireccion: string = '';
  toleranciaInicio: number = 5; // Valor por defecto de 5 minutos
  atrasoPermitido: number = 10; // Valor por defecto de 10 minutos para atraso permitido

  asignaciones: any[] = [];
  horariosAgregados: any[] = [];

  diasSemana = [
    { label: 'LU', value: 1 },
    { label: 'MA', value: 2 },
    { label: 'MI', value: 3 },
    { label: 'JU', value: 4 },
    { label: 'VI', value: 5 },
    { label: 'SÁ', value: 6 },
    { label: 'DO', value: 7 }
  ];

  jornadasDisponibles = [
    { id: '1', nombre: 'Jornada Matutina', horaEntrada: '07:00', horaSalida: '15:00' },
    { id: '2', nombre: 'Jornada Vespertina', horaEntrada: '13:00', horaSalida: '21:00' },
    { id: '3', nombre: 'Jornada Nocturna', horaEntrada: '21:00', horaSalida: '07:00' }
  ];

  map: any;

  horarioEditandoIndex: number | null = null;

  mismaUbicacionParaTodos: boolean = false;
  mostrarMapaUbicacion: boolean = false;
  indiceHorarioUbicacion: number | null = null;

  vectorSource: any;
  vectorLayer: any;
  marker: any;
  circle: any;

  radioUbicacion: number = 100;

  ultimoUsuarioSeleccionado: string = '';
  mostrarSelectorFecha: boolean = false;
  mostrarSelectorFechaInicio: boolean = false;
  mostrarSelectorFechaFin: boolean = false;
  direccionRealSeleccionada: string = '';

  horarioIdEnEdicion: string | null = null;

  cambiosSinGuardar: boolean = false;

  // Bandera para saber si estamos en edición real de un horario
  enEdicionDeHorario: boolean = false;

  @ViewChild('horaFinInput') horaFinInput!: IonInput;

  constructor(
    private horariosService: HorariosService,
    private usuariosService: UsuariosService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.cargarUsuarios();
    this.cargarHorarios();
    this.route.queryParams.subscribe(params => {
      const userId = params['userId'];
      const horarioId = params['horarioId'];
      this.horarioIdEnEdicion = horarioId || null;
      if (userId) {
        this.usuarioSeleccionado = userId;
        // Esperar a que los usuarios estén cargados antes de continuar
        if (this.usuarios.length > 0) {
          this.usuarioSeleccionadoObj = this.usuarios.find(u => u.id === userId) || null;
          this.paso = 2;
          this.cdr.detectChanges();
          if (horarioId) {
            this.cargarHorarioDesdeBackend(horarioId);
          }
        } else {
          // Si los usuarios aún no están cargados, esperar a que se carguen
          const checkUsuarios = setInterval(() => {
            if (this.usuarios.length > 0) {
              clearInterval(checkUsuarios);
              this.usuarioSeleccionadoObj = this.usuarios.find(u => u.id === userId) || null;
              this.paso = 2;
              this.cdr.detectChanges();
              if (horarioId) {
                this.cargarHorarioDesdeBackend(horarioId);
              }
            }
          }, 100);
        }
      }
    });
  }

  async mostrarAlerta(titulo: string, mensaje: string, tipo: 'success' | 'warning' | 'error' = 'success') {
    const alert = await this.alertController.create({
      header: titulo,
      message: mensaje,
      buttons: ['OK'],
      cssClass: tipo === 'error' ? 'alert-error' : tipo === 'warning' ? 'alert-warning' : 'alert-success'
    });
    await alert.present();
  }

  async cargarHorarioDesdeBackend(horarioId: string) {
    try {
      const response = await this.horariosService.obtenerHorarioPorId(horarioId).toPromise();
      const horario = response.data;
      this.nombreTurno = horario.nombreTurno;
      this.diasSeleccionados = Array.isArray(horario.dias) && horario.dias.length > 0
        ? Array.from(new Set(horario.dias.map((d: any) => d === 0 ? 7 : d).filter((d: number) => d >= 1 && d <= 7))).map(Number).sort((a, b) => a - b)
        : [1,2,3,4,5,6,7];
      if (!horario.dias || horario.dias.length === 0) {
        await this.mostrarAlerta('Advertencia', 'No se encontraron días asignados, se seleccionarán todos por defecto.', 'warning');
      }
      this.horaInicio = horario.horaInicio;
      this.horaFin = horario.horaFin;
      this.fechaInicio = horario.fechaInicio;
      this.fechaFinRepeticion = horario.fechaFinRepeticion || '';
      if (!horario.fechaFinRepeticion) {
        await this.mostrarAlerta('Advertencia', 'No se encontró fecha de fin de repetición, por favor revisa el dato.', 'warning');
      }
      this.horaAlmuerzoSalida = horario.horaAlmuerzoSalida;
      this.horaAlmuerzoRegreso = horario.horaAlmuerzoRegreso;
      this.toleranciaInicio = horario.toleranciaInicioAntes || 5;
      this.repetirTurno = false;
      this.atrasoPermitido = horario.atrasoPermitido || 10;
      this.radioUbicacion = horario.radioUbicacion ?? 100;
      this.ubicacionNombre = horario.ubicacionNombre || '';
      this.ubicacionSeleccionada = (horario.ubicacionLat && horario.ubicacionLng)
        ? { lat: horario.ubicacionLat, lng: horario.ubicacionLng }
        : (horario.ubicacionSeleccionada || null);
      // Obtener dirección real textual si hay coordenadas
      if (this.ubicacionSeleccionada && this.ubicacionSeleccionada.lat && this.ubicacionSeleccionada.lng) {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${this.ubicacionSeleccionada.lat}&lon=${this.ubicacionSeleccionada.lng}`);
          const data = await response.json();
          if (data && data.display_name) {
            this.direccionRealSeleccionada = data.display_name;
          } else {
            this.direccionRealSeleccionada = '';
          }
        } catch (error) {
          this.direccionRealSeleccionada = '';
        }
      } else {
        this.direccionRealSeleccionada = '';
      }
      // Si ya hay un horario agregado, actualízalo; si no, agrégalo
      if (this.horariosAgregados.length === 0) {
        this.horariosAgregados.push({
          nombreTurno: this.nombreTurno,
          dias: this.diasSeleccionados,
          horaInicio: this.horaInicio,
          horaFin: this.horaFin,
          fechaInicio: this.fechaInicio,
          fechaFinRepeticion: this.fechaFinRepeticion,
          horaAlmuerzoSalida: this.horaAlmuerzoSalida,
          horaAlmuerzoRegreso: this.horaAlmuerzoRegreso,
          toleranciaInicioAntes: this.toleranciaInicio,
          repetirTurno: false,
          atrasoPermitido: this.atrasoPermitido,
          radioUbicacion: this.radioUbicacion,
          ubicacionNombre: this.ubicacionNombre,
          ubicacionSeleccionada: this.ubicacionSeleccionada,
          id: horario.id
        });
        this.horarioEditandoIndex = 0;
      } else {
        this.horariosAgregados[0] = {
          nombreTurno: this.nombreTurno,
          dias: this.diasSeleccionados,
          horaInicio: this.horaInicio,
          horaFin: this.horaFin,
          fechaInicio: this.fechaInicio,
          fechaFinRepeticion: this.fechaFinRepeticion,
          horaAlmuerzoSalida: this.horaAlmuerzoSalida,
          horaAlmuerzoRegreso: this.horaAlmuerzoRegreso,
          toleranciaInicioAntes: this.toleranciaInicio,
          repetirTurno: false,
          atrasoPermitido: this.atrasoPermitido,
          radioUbicacion: this.radioUbicacion,
          ubicacionNombre: this.ubicacionNombre,
          ubicacionSeleccionada: this.ubicacionSeleccionada,
          id: horario.id
        };
        this.horarioEditandoIndex = 0;
      }
      this.enEdicionDeHorario = true;
      this.cdr.detectChanges();
    } catch (e) {
      await this.mostrarAlerta('Error', 'No se pudo cargar el horario para edición', 'error');
    }
  }

  cargarUsuarios() {
    this.usuariosService.obtenerUsuarios().subscribe({
      next: (usuarios: any[]) => {
        this.usuarios = usuarios.map(u => ({
          id: u.id,
          name: u.name,
          lastname: u.lastname,
          email: u.email,
          sinHorario: !u.horarios || u.horarios.length === 0
        }));
      },
      error: () => {
        this.usuarios = [];
        this.mostrarAlerta('Error', 'No autorizado o error al cargar usuarios. Por favor, inicia sesión nuevamente.', 'error');
      }
    });
  }

  siguientePaso() {
    console.log('Valor actual de paso al entrar:', this.paso);
    console.log('Al dar click en Siguiente, horariosAgregados:', this.horariosAgregados);

    // SOLO limpiar si realmente cambió el usuario Y NO estás en edición desde backend
    if (this.usuarioSeleccionado !== this.ultimoUsuarioSeleccionado && !this.enEdicionDeHorario) {
      this.limpiarWizard();
      this.ultimoUsuarioSeleccionado = this.usuarioSeleccionado;
    }
    this.usuarioSeleccionadoObj = this.usuarios.find(u => u.id === this.usuarioSeleccionado);

    // LOG antes de la validación
    console.log('Validando antes de avanzar, paso:', this.paso, 'horariosAgregados:', this.horariosAgregados, 'length:', this.horariosAgregados.length);

    if (this.enEdicionDeHorario && this.paso === 2) {
      this.enEdicionDeHorario = false;
    }

    if (this.paso === 2 && this.horariosAgregados.length === 0) {
      this.mostrarAlerta('Advertencia', 'Debes guardar el horario antes de continuar.', 'warning');
      return;
    }

    this.paso++;
    console.log('Nuevo valor de paso:', this.paso);
    if (this.paso === 3) {
      setTimeout(() => this.inicializarMapa(), 500);
    }
  }

  anteriorPaso() {
    if (this.horarioIdEnEdicion) {
      this.router.navigate(['/layout/home']);
      return;
    }
    this.paso--;
    if (this.paso === 3) {
      setTimeout(() => this.inicializarMapa(), 500);
    }
  }

  guardarAsignacion() {
    if (!this.horariosAgregados.every(h => h.ubicacionNombre && h.ubicacionSeleccionada)) {
      this.mostrarAlerta('Advertencia', 'Falta asignar ubicación a uno o más horarios.', 'warning');
      return;
    }
    if (!this.horariosAgregados.every(h => Array.isArray(h.dias) && h.dias.length > 0 && h.fechaFinRepeticion && h.fechaInicio)) {
      this.mostrarAlerta('Advertencia', 'Debes seleccionar al menos un día, una fecha de inicio y una fecha de fin de repetición para cada horario.', 'warning');
      return;
    }
    // Enviar cada horario con su ubicación al backend, incluyendo todos los campos requeridos
    this.horariosAgregados.forEach(horario => {
      const data: any = {
        userId: this.usuarioSeleccionado,
        dias: Array.isArray(horario.dias) ? horario.dias.map((d: number) => d === 0 ? 7 : d) : [],
        fechaInicio: horario.fechaInicio,
        fechaFinRepeticion: horario.fechaFinRepeticion,
        horaInicio: horario.horaInicio,
        horaFin: horario.horaFin
      };
      if (horario.nombreTurno) data.nombreTurno = horario.nombreTurno;
      if (horario.horaAlmuerzoSalida) data.horaAlmuerzoSalida = horario.horaAlmuerzoSalida;
      if (horario.horaAlmuerzoRegreso) data.horaAlmuerzoRegreso = horario.horaAlmuerzoRegreso;
      if (horario.toleranciaInicioAntes) data.toleranciaInicioAntes = horario.toleranciaInicioAntes;
      if (horario.ubicacionNombre) data.ubicacionNombre = horario.ubicacionNombre;
      if (horario.ubicacionSeleccionada) {
        data.ubicacionLat = horario.ubicacionSeleccionada.lat;
        data.ubicacionLng = horario.ubicacionSeleccionada.lng;
      }
      if (horario.radioUbicacion) data.radioUbicacion = horario.radioUbicacion;
      if (horario.atrasoPermitido !== undefined) data.atrasoPermitido = horario.atrasoPermitido;
      // created_at, updated_at, deleted_at son manejados por el backend
      console.log('Payload enviado al backend:', data);
      if (horario.id) {
        // Es edición
        this.horariosService.updateHorario(horario.id, data).subscribe({
          next: () => {
            this.mostrarAlerta('Éxito', 'Horario actualizado correctamente.');
            this.cargarHorarios(); // Refresca la lista de horarios tras editar
            this.cancelarFlujo();
          },
          error: (err) => {
            let msg = 'Error al actualizar el horario';
            if (err?.error?.message) {
              msg += ': ' + err.error.message;
            } else if (err?.message) {
              msg += ': ' + err.message;
            }
            this.mostrarAlerta('Error', msg, 'error');
          }
        });
      } else {
        // Es creación
        this.horariosService.createHorario(data).subscribe({
          next: () => {
            this.mostrarAlerta('Éxito', 'Asignaciones guardadas correctamente.');
            this.horariosAgregados = [];
            this.cargarUsuarios(); // Refresca la lista de usuarios
            this.usuarioSeleccionado = '';
            this.usuarioSeleccionadoObj = null;
            this.paso = 1;
          },
          error: (err) => {
            let msg = 'Error al guardar la asignación';
            if (err?.error?.message) {
              msg += ': ' + err.error.message;
            } else if (err?.message) {
              msg += ': ' + err.message;
            }
            this.mostrarAlerta('Error', msg, 'error');
          }
        });
      }
    });
  }

  eliminarAsignacion(index: number) {
    this.asignaciones.splice(index, 1);
  }

  limpiarWizard() {
    this.horariosAgregados = [];
    this.jornadaSeleccionada = '';
    this.diasSeleccionados = [];
    this.horaInicio = '';
    this.horaFin = '';
    this.ubicacionSeleccionada = null;
    this.ubicacionNombre = '';
    this.fechaInicio = '';
    this.repetirTurno = false;
    this.diasRepetir = [];
    this.fechaFinRepeticion = '';
    this.nombreTurno = '';
    this.horaAlmuerzoSalida = '';
    this.horaAlmuerzoRegreso = '';
    this.toleranciaInicio = 5;
    this.atrasoPermitido = 10;
    this.horarioEditandoIndex = null;
    this.mismaUbicacionParaTodos = false;
    this.mostrarMapaUbicacion = false;
    this.indiceHorarioUbicacion = null;
    this.radioUbicacion = 100;
  }

  cargarHorarios() {
    this.horariosService.getHorarios().subscribe(data => this.horarios = data);
  }

  obtenerNombreJornada(jornadaId: string): string {
    const jornada = this.jornadasDisponibles.find(j => j.id === jornadaId);
    return jornada ? jornada.nombre : '';
  }

  toggleDiaRepetir(dia: number) {
    if (this.diasRepetir.includes(dia)) {
      this.diasRepetir = this.diasRepetir.filter(d => d !== dia);
    } else {
      this.diasRepetir.push(dia);
    }
  }

  cancelar() {
    this.usuarioSeleccionado = '';
    this.ubicacionSeleccionada = null;
    this.fechaInicio = '';
    this.horaInicio = '';
    this.horaFin = '';
    this.horasMinimas = '';
    this.repetirTurno = false;
    this.diasRepetir = [];
    this.fechaFinRepeticion = '';
  }

  editarHorarioAgregado(i: number) {
    const horario = this.horariosAgregados[i];
    this.nombreTurno = horario.nombreTurno;
    this.diasSeleccionados = Array.isArray(horario.dias) && horario.dias.length > 0
      ? Array.from(new Set(horario.dias.map((d: any) => d === 0 ? 7 : Number(d)).filter((d: number) => d >= 1 && d <= 7))).map(Number).sort((a, b) => a - b)
      : [1,2,3,4,5,6,7];
    this.horaInicio = horario.horaInicio;
    this.horaFin = horario.horaFin;
    this.fechaInicio = this.formatearFechaInput(horario.fechaInicio);
    this.fechaFinRepeticion = this.formatearFechaInput(horario.fechaFinRepeticion);
    this.horaAlmuerzoSalida = horario.horaAlmuerzoSalida;
    this.horaAlmuerzoRegreso = horario.horaAlmuerzoRegreso;
    this.toleranciaInicio = horario.toleranciaInicioAntes || 5;
    this.atrasoPermitido = horario.atrasoPermitido || 10;
    this.radioUbicacion = horario.radioUbicacion ?? 100;
    this.ubicacionNombre = horario.ubicacionNombre || '';
    this.ubicacionSeleccionada = horario.ubicacionSeleccionada || null;
    this.horarioEditandoIndex = i;
    // Aseguro que el id se mantenga en el objeto editado
    if (horario.id) {
      this.horariosAgregados[i].id = horario.id;
    }
    this.cdr.detectChanges();
  }

  // Utilidad para formatear fechas al formato yyyy-MM-dd
  formatearFechaInput(fecha: string): string {
    if (!fecha) return '';
    if (fecha.includes('/')) {
      // Si viene en formato dd/mm/yyyy
      const [d, m, y] = fecha.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return fecha; // Si ya está en formato correcto
  }

  guardarHorario() {
    if (!this.horaInicio || !this.horaFin) {
      this.mostrarAlerta('Advertencia', 'Por favor, completa la hora de inicio y fin.', 'warning');
      return;
    }
    if (this.horaInicio && this.horaFin && this.horaFin <= this.horaInicio) {
      this.mostrarAlerta('Advertencia', 'No se puede seleccionar una hora de fin igual o anterior a la hora de inicio.', 'warning');
      this.horaFin = '';
      return;
    }
    if (!this.fechaInicio || !this.fechaFinRepeticion) {
      this.mostrarAlerta('Advertencia', 'Por favor, completa las fechas de inicio y fin de repetición.', 'warning');
      return;
    }
    if (new Date(this.fechaFinRepeticion) < new Date(this.fechaInicio)) {
      this.mostrarAlerta('Advertencia', 'La fecha de fin de repetición no puede ser anterior a la fecha de inicio del turno.', 'warning');
      return;
    }
    if (!this.diasSeleccionados || this.diasSeleccionados.length === 0) {
      this.mostrarAlerta('Advertencia', 'Debes seleccionar al menos un día para el horario.', 'warning');
      return;
    }
    // Normaliza y ordena los días antes de guardar (1-7, sin duplicados ni ceros)
    let dias: number[] = Array.from(new Set(this.diasSeleccionados.map(d => d === 0 ? 7 : d).filter((d: number) => d >= 1 && d <= 7))).sort((a, b) => (a as number) - (b as number));
    const horario: any = {
      nombreTurno: this.nombreTurno,
      dias,
      horaInicio: this.horaInicio,
      horaFin: this.horaFin,
      fechaInicio: this.fechaInicio,
      fechaFinRepeticion: this.fechaFinRepeticion,
      horaAlmuerzoSalida: this.horaAlmuerzoSalida,
      horaAlmuerzoRegreso: this.horaAlmuerzoRegreso,
      toleranciaInicioAntes: this.toleranciaInicio,
      repetirTurno: this.repetirTurno,
      atrasoPermitido: this.atrasoPermitido,
      radioUbicacion: this.radioUbicacion,
      ubicacionNombre: this.ubicacionNombre,
      ubicacionSeleccionada: this.ubicacionSeleccionada
    };
    // Si estamos editando, aseguramos que el id se mantenga
    if (this.horarioEditandoIndex !== null && this.horariosAgregados[this.horarioEditandoIndex]?.id) {
      horario.id = this.horariosAgregados[this.horarioEditandoIndex].id;
    }
    if (this.horarioEditandoIndex !== null) {
      this.horariosAgregados[this.horarioEditandoIndex] = horario;
      this.horarioEditandoIndex = null;
    } else {
      this.horariosAgregados.push(horario);
    }
    this.mostrarAlerta('Éxito', '¡Horario guardado correctamente!');
    if (!this.enEdicionDeHorario) {
      this.limpiarFormularioHorario();
    } else {
      this.diasSeleccionados = [];
      this.horaInicio = '';
      this.horaFin = '';
      this.fechaInicio = '';
      this.repetirTurno = false;
      this.nombreTurno = '';
      this.horaAlmuerzoSalida = '';
      this.horaAlmuerzoRegreso = '';
      this.toleranciaInicio = 5;
      this.atrasoPermitido = 10;
      this.fechaFinRepeticion = '';
    }
    this.cambiosSinGuardar = false;
  }

  agregarNuevoHorario() {
    this.limpiarFormularioHorario();
    this.horarioEditandoIndex = null;
  }

  limpiarFormularioHorario() {
    this.diasSeleccionados = [];
    this.horaInicio = '';
    this.horaFin = '';
    this.fechaInicio = '';
    this.repetirTurno = false;
    this.nombreTurno = '';
    this.horaAlmuerzoSalida = '';
    this.horaAlmuerzoRegreso = '';
    this.toleranciaInicio = 5;
    this.atrasoPermitido = 10;
    this.fechaFinRepeticion = '';
    this.horarioEditandoIndex = null;
  }

  eliminarHorarioAgregado(index: number) {
    this.horariosAgregados.splice(index, 1);
  }

  obtenerNombresDias(dias: number[]): string {
    // Normaliza domingo a 7 si viene como 0
    const diasNormalizados = dias.map(d => d === 0 ? 7 : d);
    // Ordena de lunes (1) a domingo (7)
    const diasOrdenados = diasNormalizados.sort((a, b) => a - b);
    const nombres = ['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO'];
    return diasOrdenados.map(d => nombres[d - 1] ?? 'Día no válido').join(', ');
  }

  inicializarMapa() {
    const mapElement = document.getElementById('map');
    console.log('¿Existe el div del mapa?', !!mapElement);
    if (!mapElement) {
      setTimeout(() => this.inicializarMapa(), 100);
      return;
    }
    if (this.map) {
      setTimeout(() => {
        this.map.updateSize();
      }, 200);
      return;
    }
    this.vectorSource = new VectorSource();
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource
    });
    this.map = new Map({
      target: mapElement,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        this.vectorLayer
      ],
      view: new View({
        center: fromLonLat([-78.5123274, -0.2201641]),
        zoom: 15
      })
    });

    // Evento click SOLO UNA VEZ
    this.map.on('click', async (evt: any) => {
      // Guarda la ubicación en grados decimales
      const [lon, lat] = toLonLat(evt.coordinate);
      this.ubicacionSeleccionada = { lat, lng: lon };
      this.vectorSource.clear();

      // Dibuja el marcador y el círculo usando evt.coordinate (EPSG:3857)
      this.marker = new Feature({
        geometry: new Point(evt.coordinate)
      });
      this.marker.setStyle(new Style({
        image: new Icon({
          src: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
          scale: 0.05
        })
      }));
      this.vectorSource.addFeature(this.marker);

      if (this.circle) {
        this.vectorSource.removeFeature(this.circle);
      }
      this.circle = new Feature({
        geometry: new OlCircle(evt.coordinate, this.radioUbicacion || 100)
      });
      this.circle.setStyle(new Style({
        stroke: new Stroke({ color: 'rgba(0,123,255,0.5)', width: 2 }),
        fill: new Fill({ color: 'rgba(0,123,255,0.1)' })
      }));
      this.vectorSource.addFeature(this.circle);

      // Geocodificación inversa para obtener la dirección textual
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const data = await response.json();
        if (data && data.display_name) {
          this.direccionRealSeleccionada = data.display_name;
        } else {
          this.direccionRealSeleccionada = '';
        }
        this.cdr.detectChanges();
      } catch (error) {
        this.direccionRealSeleccionada = '';
        this.cdr.detectChanges();
      }
    });

    // Después de crear el mapa y fuera del evento click, agrega este listener:
    const radioInput = document.querySelector('ion-input[name="radioUbicacion"]');
    if (radioInput) {
      radioInput.addEventListener('ionChange', (event: any) => {
        if (this.ubicacionSeleccionada && this.marker) {
          // Dibuja el círculo con el nuevo radio
          if (this.circle) {
            this.vectorSource.removeFeature(this.circle);
          }
          // Convierte la ubicación seleccionada a la proyección del mapa
          const coords = fromLonLat([this.ubicacionSeleccionada.lng, this.ubicacionSeleccionada.lat]);
          this.circle = new Feature({
            geometry: new OlCircle(coords, this.radioUbicacion || 100)
          });
          this.circle.setStyle(new Style({
            stroke: new Stroke({ color: 'rgba(0,123,255,0.5)', width: 2 }),
            fill: new Fill({ color: 'rgba(0,123,255,0.1)' })
          }));
          this.vectorSource.addFeature(this.circle);
        }
      });
    }

    setTimeout(() => {
      this.map.updateSize();
    }, 200);

    // Centrar y dibujar marcador/círculo si ya hay ubicación seleccionada
    if (this.ubicacionSeleccionada) {
      const coords = fromLonLat([this.ubicacionSeleccionada.lng, this.ubicacionSeleccionada.lat]);
      this.map.getView().setCenter(coords);
      this.map.getView().setZoom(16);
      this.vectorSource.clear();
      this.marker = new Feature({
        geometry: new Point(coords)
      });
      this.marker.setStyle(new Style({
        image: new Icon({
          src: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
          scale: 0.05
        })
      }));
      this.vectorSource.addFeature(this.marker);
      this.circle = new Feature({
        geometry: new OlCircle(coords, this.radioUbicacion || 100)
      });
      this.circle.setStyle(new Style({
        stroke: new Stroke({ color: 'rgba(0,123,255,0.5)', width: 2 }),
        fill: new Fill({ color: 'rgba(0,123,255,0.1)' })
      }));
      this.vectorSource.addFeature(this.circle);
    }
  }

  toggleDia(dia: number) {
    const idx = this.diasSeleccionados.indexOf(dia);
    if (idx > -1) {
      this.diasSeleccionados.splice(idx, 1);
    } else {
      this.diasSeleccionados.push(dia);
    }
  }

  eliminarHorario(id: string) {
    if (!id) return;
    this.horariosService.deleteHorario(id).subscribe(() => this.cargarHorarios());
  }

  limpiarFormulario() {
    this.fechaInicio = '';
    this.horaInicio = '';
    this.horaFin = '';
    this.ubicacionSeleccionada = null;
    this.ubicacionNombre = '';
  }

  async buscarDireccion() {
    if (!this.busquedaDireccion) return;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.busquedaDireccion)}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        const lon = parseFloat(result.lon);
        const lat = parseFloat(result.lat);
        if (this.map) {
          const coords = fromLonLat([lon, lat]);
          this.map.getView().setCenter(coords);
          this.map.getView().setZoom(16);

          // Dibuja el puntero y el círculo en la nueva ubicación
          this.ubicacionSeleccionada = { lat, lng: lon };
          this.vectorSource.clear();

          this.marker = new Feature({
            geometry: new Point(coords)
          });
          this.marker.setStyle(new Style({
            image: new Icon({
              src: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
              scale: 0.05
            })
          }));
          this.vectorSource.addFeature(this.marker);

          if (this.circle) {
            this.vectorSource.removeFeature(this.circle);
          }
          this.circle = new Feature({
            geometry: new OlCircle(coords, this.radioUbicacion || 100)
          });
          this.circle.setStyle(new Style({
            stroke: new Stroke({ color: 'rgba(0,123,255,0.5)', width: 2 }),
            fill: new Fill({ color: 'rgba(0,123,255,0.1)' })
          }));
          this.vectorSource.addFeature(this.circle);
        }
      } else {
        this.mostrarAlerta('Error', 'Dirección no encontrada', 'error');
      }
    } catch (error) {
      this.mostrarAlerta('Error', 'Error al buscar la dirección', 'error');
    }
  }

  get usuariosSeleccionados() {
    return this.usuarios && this.usuarios.some(u => u.seleccionado);
  }

  abrirSelectorUbicacion(i: number) {
    this.indiceHorarioUbicacion = i;
    // Si se va a asignar la misma ubicación para todos, no reinicialices el mapa si ya está abierto
    if (this.mismaUbicacionParaTodos && this.mostrarMapaUbicacion) {
      return;
    }
    this.mostrarMapaUbicacion = false; // Oculta primero para forzar el *ngIf
    setTimeout(() => {
      this.mostrarMapaUbicacion = true;
      setTimeout(() => {
        if (this.map) {
          this.map.setTarget(null); // Destruye el mapa anterior
          this.map = null;
        }
        this.inicializarMapa();
      }, 400);
    }, 100);
  }

  cerrarSelectorUbicacion() {
    this.mostrarMapaUbicacion = false;
    this.indiceHorarioUbicacion = null;
    this.ubicacionNombre = '';
    this.ubicacionSeleccionada = null;
    this.busquedaDireccion = '';
  }

  asignarUbicacionSeleccionada() {
    if (this.indiceHorarioUbicacion === null) return;
    const ubicacion = {
      ubicacionNombre: this.ubicacionNombre,
      ubicacionSeleccionada: this.ubicacionSeleccionada,
      radioUbicacion: this.radioUbicacion
    };
    if (this.mismaUbicacionParaTodos) {
      this.horariosAgregados.forEach(h => {
        h.ubicacionNombre = this.ubicacionNombre;
        h.ubicacionSeleccionada = this.ubicacionSeleccionada;
        h.radioUbicacion = this.radioUbicacion;
      });
    } else {
      this.horariosAgregados[this.indiceHorarioUbicacion].ubicacionNombre = this.ubicacionNombre;
      this.horariosAgregados[this.indiceHorarioUbicacion].ubicacionSeleccionada = this.ubicacionSeleccionada;
      this.horariosAgregados[this.indiceHorarioUbicacion].radioUbicacion = this.radioUbicacion;
    }
    this.cerrarSelectorUbicacion();
  }

  todasUbicacionesAsignadas() {
    return this.horariosAgregados.every(h => h.ubicacionNombre && h.ubicacionSeleccionada);
  }

  onMismaUbicacionChange() {
    if (this.mismaUbicacionParaTodos && this.horariosAgregados.length > 0) {
      // Si ya hay una ubicación en el primer horario, propágala a los demás
      const ref = this.horariosAgregados[0];
      if (ref.ubicacionNombre && ref.ubicacionSeleccionada) {
        this.horariosAgregados.forEach(h => {
          h.ubicacionNombre = ref.ubicacionNombre;
          h.ubicacionSeleccionada = ref.ubicacionSeleccionada;
        });
      }
    }
  }

  // Métodos para refrescar la vista al seleccionar fechas en los calendarios flotantes
  onFechaInicioChange() {
    // No es necesario hacer nada, el ngModel ya actualiza la vista
  }
  async onFechaFinChange() {
    // No es necesario hacer nada, el ngModel ya actualiza la vista
  }
  onFechaFinRepeticionChange() {
    // No es necesario hacer nada, el ngModel ya actualiza la vista
  }

  async validarFechaFinRepeticion() {
    if (this.fechaInicio && this.fechaFinRepeticion) {
      const fechaInicio = new Date(this.fechaInicio);
      const fechaFin = new Date(this.fechaFinRepeticion);
      
      if (fechaFin < fechaInicio) {
        await this.mostrarAlerta('Error', 'La fecha de fin de repetición no puede ser anterior a la fecha de inicio del turno.');
        this.fechaFinRepeticion = '';
      }
    }
  }

  async onHoraFinChange() {
    if (this.horaInicio && this.horaFin) {
      // Convertir a minutos para comparar
      const [hi, mi] = this.horaInicio.split(":").map(Number);
      const [hf, mf] = this.horaFin.split(":").map(Number);
      const minInicio = hi * 60 + mi;
      const minFin = hf * 60 + mf;
      if (minFin <= minInicio) {
        await this.mostrarAlerta('Advertencia', 'No se puede seleccionar una hora de fin igual o anterior a la hora de inicio.', 'warning');
        this.horaFin = '';
      }
    }
  }

  cancelarFlujo() {
    if (this.horarioIdEnEdicion) {
      this.router.navigate(['/layout/home']);
    } else {
      // Vuelve a la selección de usuario
      this.usuarioSeleccionado = '';
      this.ubicacionSeleccionada = null;
      this.fechaInicio = '';
      this.horaInicio = '';
      this.horaFin = '';
      this.horasMinimas = '';
      this.repetirTurno = false;
      this.diasRepetir = [];
      this.fechaFinRepeticion = '';
      this.paso = 1;
    }
  }

  onCampoEditado() {
    this.cambiosSinGuardar = true;
  }
} 
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HorariosService, Horario } from '../../services/horarios.service';
import { UsuariosService, Usuario } from '../../services/usuarios.service';
import { IonicModule } from '@ionic/angular';
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
  fechaFin: string = '';
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
  toleranciaFin: number = 10; // Valor por defecto de 10 minutos
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
    { label: 'DO', value: 0 }
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

  constructor(
    private horariosService: HorariosService,
    private usuariosService: UsuariosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarUsuarios();
    this.cargarHorarios();
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
        alert('No autorizado o error al cargar usuarios. Por favor, inicia sesión nuevamente.');
      }
    });
  }

  siguientePaso() {
    if (this.usuarioSeleccionado !== this.ultimoUsuarioSeleccionado) {
      this.limpiarWizard();
      this.ultimoUsuarioSeleccionado = this.usuarioSeleccionado;
    }
    this.usuarioSeleccionadoObj = this.usuarios.find(u => u.id === this.usuarioSeleccionado);
    this.paso++;
    if (this.paso === 3) {
      setTimeout(() => this.inicializarMapa(), 500);
    }
  }

  anteriorPaso() {
    this.paso--;
    if (this.paso === 3) {
      setTimeout(() => this.inicializarMapa(), 500);
    }
  }

  guardarAsignacion() {
    // Validar que todos los horarios tengan ubicación
    if (!this.horariosAgregados.every(h => h.ubicacionNombre && h.ubicacionSeleccionada)) {
      alert('Falta asignar ubicación a uno o más horarios.');
      return;
    }
    // Enviar cada horario con su ubicación al backend, incluyendo todos los campos del modelo
    this.horariosAgregados.forEach(horario => {
      const data: any = {
        userId: this.usuarioSeleccionado,
        dias: Array.isArray(horario.dias) ? horario.dias.map((d: number) => d === 0 ? 7 : d) : [],
        horaInicio: horario.horaInicio,
        horaFin: horario.horaFin
      };
      if (horario.nombreTurno) data.nombreTurno = horario.nombreTurno;
      if (horario.fechaInicio) data.fechaInicio = horario.fechaInicio;
      if (horario.fechaFin) data.fechaFin = horario.fechaFin;
      if (horario.horaAlmuerzoSalida) data.horaAlmuerzoSalida = horario.horaAlmuerzoSalida;
      if (horario.horaAlmuerzoRegreso) data.horaAlmuerzoRegreso = horario.horaAlmuerzoRegreso;
      if (horario.toleranciaInicioAntes) data.toleranciaInicioAntes = horario.toleranciaInicioAntes;
      if (horario.toleranciaInicioDespues) data.toleranciaInicioDespues = horario.toleranciaInicioDespues;
      if (horario.toleranciaFinDespues) data.toleranciaFinDespues = horario.toleranciaFinDespues;
      if (typeof horario.repetirTurno !== 'undefined') data.repetirTurno = horario.repetirTurno;
      if (horario.fechaFinRepeticion) data.fechaFinRepeticion = horario.fechaFinRepeticion;
      if (horario.ubicacionNombre) data.ubicacionNombre = horario.ubicacionNombre;
      if (horario.ubicacionSeleccionada) {
        data.ubicacionLat = horario.ubicacionSeleccionada.lat;
        data.ubicacionLng = horario.ubicacionSeleccionada.lng;
      }
      if (horario.radioUbicacion) data.radioUbicacion = horario.radioUbicacion;
      if (horario.atrasoPermitido !== undefined) data.atrasoPermitido = horario.atrasoPermitido;
      // created_at, updated_at, deleted_at son manejados por el backend
      console.log('Payload enviado al backend:', data);
      this.horariosService.createHorario(data).subscribe({
        next: () => {
          // Puedes agregar lógica para mostrar éxito o limpiar el formulario
        },
        error: (err) => {
          let msg = 'Error al guardar la asignación';
          if (err?.error?.message) {
            msg += ': ' + err.error.message;
          } else if (err?.message) {
            msg += ': ' + err.message;
          }
          alert(msg);
        }
      });
    });
    // Actualiza el array local de usuarios para reflejar la asignación en el frontend
    const idx = this.usuarios.findIndex(u => u.id === this.usuarioSeleccionado);
    if (idx !== -1) {
      this.usuarios[idx].sinHorario = false;
    }
    // Limpiar después de guardar
    this.horariosAgregados = [];
    this.cargarUsuarios(); // Refresca la lista de usuarios
    this.usuarioSeleccionado = '';
    this.usuarioSeleccionadoObj = null;
    this.paso = 1;
    alert('Asignaciones guardadas correctamente.');
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
    this.fechaFin = '';
    this.repetirTurno = false;
    this.diasRepetir = [];
    this.fechaFinRepeticion = '';
    this.nombreTurno = '';
    this.horaAlmuerzoSalida = '';
    this.horaAlmuerzoRegreso = '';
    this.toleranciaInicio = 5;
    this.toleranciaFin = 10;
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
    this.fechaFin = '';
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
    this.diasSeleccionados = [...horario.dias];
    this.horaInicio = horario.horaInicio;
    this.horaFin = horario.horaFin;
    this.fechaInicio = horario.fechaInicio;
    this.fechaFin = horario.fechaFin;
    this.fechaFinRepeticion = horario.fechaFinRepeticion;
    this.horaAlmuerzoSalida = horario.horaAlmuerzoSalida;
    this.horaAlmuerzoRegreso = horario.horaAlmuerzoRegreso;
    this.toleranciaInicio = horario.toleranciaInicioAntes || 5;
    this.toleranciaFin = horario.toleranciaFinDespues || 10;
    this.repetirTurno = horario.dias && horario.dias.length > 0;
    this.horarioEditandoIndex = i;
    this.radioUbicacion = horario.radioUbicacion ?? 100;
  }

  guardarHorario() {
    if (!this.horaInicio || !this.horaFin) {
      alert('Completa todos los campos antes de guardar el horario.');
      return;
    }
    let dias: number[] = [];
    if (this.repetirTurno) {
      dias = [...this.diasSeleccionados];
    } else if (this.fechaInicio) {
      // Calcular el día de la semana usando el algoritmo de Zeller para evitar usar Date
      const [yearStr, monthStr, dayStr] = this.fechaInicio.split('-');
      let y = parseInt(yearStr, 10);
      let m = parseInt(monthStr, 10);
      const d = parseInt(dayStr, 10);
      if (m < 3) {
        m += 12;
        y--;
      }
      const h = (d + Math.floor((13 * (m + 1)) / 5) + y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)) % 7;
      // Zeller: 0=Saturday, 1=Sunday, ..., 6=Friday. Queremos 0=Domingo, 1=Lunes, ...
      const diaSemana = (h + 6) % 7;
      dias = [diaSemana];
    }
    const horario = {
      nombreTurno: this.nombreTurno,
      dias,
      horaInicio: this.horaInicio,
      horaFin: this.horaFin,
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      horaAlmuerzoSalida: this.horaAlmuerzoSalida,
      horaAlmuerzoRegreso: this.horaAlmuerzoRegreso,
      toleranciaInicioAntes: this.toleranciaInicio,
      toleranciaInicioDespues: this.toleranciaInicio,
      toleranciaFinDespues: this.toleranciaFin,
      repetirTurno: this.repetirTurno,
      fechaFinRepeticion: this.fechaFinRepeticion,
      atrasoPermitido: this.atrasoPermitido,
      radioUbicacion: this.radioUbicacion
    };
    if (this.horarioEditandoIndex !== null) {
      this.horariosAgregados[this.horarioEditandoIndex] = horario;
      this.horarioEditandoIndex = null;
    } else {
      this.horariosAgregados.push(horario);
    }
    this.limpiarFormularioHorario();
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
    this.fechaFin = '';
    this.repetirTurno = false;
    this.nombreTurno = '';
    this.horaAlmuerzoSalida = '';
    this.horaAlmuerzoRegreso = '';
    this.toleranciaInicio = 5;
    this.toleranciaFin = 10;
    this.atrasoPermitido = 10;
    this.fechaFinRepeticion = '';
    this.horarioEditandoIndex = null;
  }

  eliminarHorarioAgregado(index: number) {
    this.horariosAgregados.splice(index, 1);
  }

  obtenerNombresDias(dias: number[]): string {
    const nombres = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SÁ'];
    return dias.map(d => nombres[d === 7 ? 0 : d] ?? 'Día no válido').join(', ');
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
    this.fechaFin = '';
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
        alert('Dirección no encontrada');
      }
    } catch (error) {
      alert('Error al buscar la dirección');
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
  onFechaFinChange() {
    // No es necesario hacer nada, el ngModel ya actualiza la vista
  }
  onFechaFinRepeticionChange() {
    // No es necesario hacer nada, el ngModel ya actualiza la vista
  }
} 
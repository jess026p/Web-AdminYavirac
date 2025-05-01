import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
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
import { defaults as defaultControls, Zoom } from 'ol/control';
import Circle from 'ol/geom/Circle';
import { UbicacionesService } from '../../services/ubicaciones.service';
import { UsuariosService } from '../../services/usuarios.service';
import { ShiftsService, Horario, Jornada } from '../../services/shifts.service';
import { AlertController, ToastController } from '@ionic/angular';

interface Site {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  employee_id: string;
}

interface ApiError {
  status: number;
  message?: string;
}

@Component({
  selector: 'app-ubicaciones',
  templateUrl: './ubicaciones.page.html',
  styleUrls: ['./ubicaciones.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule
  ]
})
export class UbicacionesPage implements OnInit, AfterViewInit {
  lat: number = -0.2201641;  // Coordenadas iniciales para Quito
  lon: number = -78.5123274;
  direccion: string = '';
  usuarioSeleccionado: string | null = null;
  busquedaDireccion: string = '';
  mostrarMapaYUbicacion: boolean = false;
  map!: Map;
  marker!: Feature;
  circle!: Feature;
  vectorSource!: VectorSource;
  vectorLayer!: VectorLayer<VectorSource>;
  usuarios: any[] = [];
  ubicaciones: Site[] = [];
  cargando = false;
  diasSeleccionados: string[] = [];
  jornadaSeleccionada: string = '';
  horarios: any[] = [];
  jornadasDisponibles: Jornada[] = [];

  // Estilos del mapa
  markerStyle = new Style({
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({
        color: '#0088ff'
      }),
      stroke: new Stroke({
        color: '#fff',
        width: 2
      })
    })
  });

  circleStyle = new Style({
    fill: new Fill({
      color: 'rgba(0, 128, 255, 0.2)'
    }),
    stroke: new Stroke({
      color: '#0088ff',
      width: 2
    })
  });

  constructor(
    private ubicacionesService: UbicacionesService,
    private usuariosService: UsuariosService,
    private shiftsService: ShiftsService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    this.jornadasDisponibles = this.shiftsService.jornadasPredefinidas;
  }

  async ngOnInit() {
    await this.cargarDatos();
  }

  ngAfterViewInit() {
    // Solo inicializamos el mapa cuando se muestra
    this.inicializarMapaSiEsNecesario();
  }

  siguientePaso() {
    this.mostrarMapaYUbicacion = true;
    // Inicializamos el mapa después de mostrar la sección
    setTimeout(() => {
      this.inicializarMapaSiEsNecesario();
    }, 300);
  }

  private inicializarMapaSiEsNecesario() {
    if (this.mostrarMapaYUbicacion && !this.map) {
      this.inicializarMapa();
    }
  }

  async cargarDatos() {
    this.cargando = true;
    try {
      const usuarios = await this.usuariosService.obtenerUsuarios().toPromise();
      this.usuarios = usuarios || [];
      if (this.usuarioSeleccionado) {
        await this.cargarUbicaciones();
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      this.mostrarAlerta('Error', 'No se pudieron cargar los usuarios');
    } finally {
      this.cargando = false;
    }
  }

  async cargarUbicaciones() {
    if (!this.usuarioSeleccionado) return;
    
    try {
      const ubicaciones = await this.ubicacionesService.obtenerUbicaciones().toPromise();
      // Filtramos las ubicaciones para mostrar solo las del usuario seleccionado
      this.ubicaciones = (ubicaciones || []).filter(
        ubicacion => ubicacion.employee_id === this.usuarioSeleccionado
      );
    } catch (error: unknown) {
      console.error('Error al cargar ubicaciones:', error);
      // No mostramos alerta si no hay ubicaciones, es un caso normal
      if ((error as ApiError).status !== 404) {
        this.mostrarAlerta('Error', 'No se pudieron cargar las ubicaciones');
      }
    }
  }

  inicializarMapa() {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('Elemento del mapa no encontrado');
      return;
    }

    mapElement.style.height = '400px';
    mapElement.style.width = '100%';

    const initialCoords = fromLonLat([this.lon, this.lat]);

    this.vectorSource = new VectorSource();
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource
    });

    this.map = new Map({
      target: mapElement,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        this.vectorLayer
      ],
      view: new View({
        center: initialCoords,
        zoom: 13
      }),
      controls: defaultControls().extend([new Zoom()])
    });

    this.agregarMarcador(initialCoords);

    this.map.on('click', (evt) => {
      const coords = evt.coordinate;
      const lonlat = toLonLat(coords);
      this.lon = lonlat[0];
      this.lat = lonlat[1];
      this.vectorSource.clear();
      this.agregarMarcador(coords);
      this.obtenerDireccion(this.lat, this.lon);
    });

    setTimeout(() => {
      this.map.updateSize();
    }, 200);
  }

  private agregarMarcador(coords: number[]) {
    this.marker = new Feature({
      geometry: new Point(coords)
    });
    this.marker.setStyle(this.markerStyle);

    this.circle = new Feature({
      geometry: new Circle(coords, 100)
    });
    this.circle.setStyle(this.circleStyle);

    this.vectorSource.addFeatures([this.marker, this.circle]);
  }

  async obtenerDireccion(lat: number, lon: number) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      this.direccion = data.display_name || 'Dirección no encontrada';
    } catch (error) {
      console.error('Error al obtener la dirección:', error);
      this.direccion = 'No se pudo obtener la dirección';
    }
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
        this.lat = parseFloat(result.lat);
        this.lon = parseFloat(result.lon);
        this.direccion = result.display_name;
        const coords = fromLonLat([this.lon, this.lat]);
        this.vectorSource.clear();
        this.agregarMarcador(coords);
        this.map.getView().setCenter(coords);
      } else {
        this.mostrarAlerta('Error', 'Dirección no encontrada');
      }
    } catch (error) {
      console.error('Error al buscar dirección:', error);
      this.mostrarAlerta('Error', 'Error al buscar la dirección');
    }
  }

  async crearUbicacion() {
    if (!this.usuarioSeleccionado || !this.direccion) {
      this.mostrarAlerta('Error', 'Por favor complete todos los campos');
      return;
    }

    const ubicacion: Site = {
      name: this.direccion || 'Nueva ubicación',
      latitude: this.lat,
      longitude: this.lon,
      radius: 100,
      employee_id: this.usuarioSeleccionado
    };

    try {
      await this.ubicacionesService.crearUbicacion(ubicacion).toPromise();
      this.mostrarAlerta('Éxito', 'Ubicación creada correctamente');
      await this.cargarUbicaciones();
      // Limpiamos los campos después de crear
      this.direccion = '';
      this.busquedaDireccion = '';
    } catch (error) {
      console.error('Error al crear ubicación:', error);
      this.mostrarAlerta('Error', 'No se pudo crear la ubicación');
    }
  }

  async eliminarUbicacion(id: string) {
    try {
      await this.ubicacionesService.eliminarUbicacion(id).toPromise();
      this.mostrarAlerta('Éxito', 'Ubicación eliminada correctamente');
      await this.cargarUbicaciones();
    } catch (error) {
      console.error('Error al eliminar ubicación:', error);
      this.mostrarAlerta('Error', 'No se pudo eliminar la ubicación');
    }
  }

  async mostrarAlerta(titulo: string, mensaje: string) {
    const alert = await this.alertController.create({
      header: titulo,
      message: mensaje,
      buttons: ['OK']
    });
    await alert.present();
  }

  puedeAgregarHorario(): boolean {
    return this.diasSeleccionados.length > 0 && this.jornadaSeleccionada !== '';
  }

  puedeGuardarConfiguracion(): boolean {
    return this.horarios.length > 0;
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    toast.present();
  }

  agregarHorario() {
    if (!this.usuarioSeleccionado || !this.jornadaSeleccionada) return;

    const jornada = this.jornadasDisponibles.find(j => j.id === this.jornadaSeleccionada);
    if (!jornada) return;

    const nuevoHorario = {
      days: this.diasSeleccionados,
      jornada_id: this.jornadaSeleccionada,
      start_time: jornada.horaEntrada,
      end_time: jornada.horaSalida,
      employee_id: this.usuarioSeleccionado
    };

    this.horarios.push(nuevoHorario);
    this.diasSeleccionados = [];
    this.jornadaSeleccionada = '';
  }

  eliminarHorario(horario: Horario) {
    const index = this.horarios.indexOf(horario);
    if (index > -1) {
      this.horarios.splice(index, 1);
    }
  }

  obtenerNombresDias(dias: string[]): string {
    const nombresDias: { [key: string]: string } = {
      '0': 'Domingo',
      '1': 'Lunes',
      '2': 'Martes',
      '3': 'Miércoles',
      '4': 'Jueves',
      '5': 'Viernes',
      '6': 'Sábado'
    };
    return dias.map(dia => nombresDias[dia]).join(', ');
  }

  formatearHora(hora: string): string {
    try {
      const [hours, minutes] = hora.split(':');
      return `${hours}:${minutes}`;
    } catch {
      return hora;
    }
  }

  async guardarConfiguracion() {
    try {
      for (const horario of this.horarios) {
        if (!horario.id) {
          await this.shiftsService.guardarHorario(horario).toPromise();
        }
      }
      this.presentToast('Configuración guardada exitosamente', 'success');
    } catch (error) {
      this.presentToast('Error al guardar la configuración', 'danger');
    }
  }

  obtenerNombreJornada(jornadaId: string): string {
    const jornada = this.jornadasDisponibles.find(j => j.id === jornadaId);
    return jornada ? jornada.nombre : '';
  }

  obtenerHorarioJornada(jornadaId: string): string {
    const jornada = this.jornadasDisponibles.find(j => j.id === jornadaId);
    return jornada ? `${jornada.horaEntrada} - ${jornada.horaSalida}` : '';
  }
}
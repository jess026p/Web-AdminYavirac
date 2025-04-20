import { Component, OnInit, AfterViewInit } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Icon, Style } from 'ol/style';
import { defaults as defaultControls } from 'ol/control';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton,
  IonSelect, IonSelectOption
} from '@ionic/angular/standalone';


@Component({
  selector: 'app-ubicaciones',
  templateUrl: './ubicaciones.page.html',
  styleUrls: ['./ubicaciones.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonSelect, IonSelectOption,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonToolbar, IonTitle, IonHeader, IonContent, IonButton
  ]
})
export class UbicacionesPage implements OnInit, AfterViewInit {
  lat: number | null = null;
  lon: number | null = null;
  direccion: string = '';
  usuarioSeleccionado: number | null = null;

  map!: Map;
  marker!: Feature;
  vectorSource!: VectorSource;

  usuarios = [
    { id: 1, nombre: 'María Pérez' },
    { id: 2, nombre: 'Carlos López' },
    { id: 3, nombre: 'Andrea Torres' },
  ];

  provincias = [
    {
      nombre: 'Tungurahua',
      ciudades: ['Ambato', 'Pelileo', 'Baños']
    },
    {
      nombre: 'Pichincha',
      ciudades: ['Quito', 'Cayambe', 'Machachi']
    },
    {
      nombre: 'Cotopaxi',
      ciudades: ['Latacunga', 'Salcedo', 'La Maná']
    }
  ];

  provinciaSeleccionada: string | null = null;
  ciudadesFiltradas: string[] = [];
  ciudadSeleccionada: string | null = null;

  constructor() {}

  ngOnInit() {
    // Carga inicial (Ambato)
    this.lat = -1.25;
    this.lon = -78.62;
  }

  ngAfterViewInit() {
    if (this.lat && this.lon) {
      this.mostrarMapa();
    }
  }

  mostrarMapa() {
    const initialCoords = fromLonLat([this.lon!, this.lat!]);

    this.marker = new Feature({
      geometry: new Point(initialCoords),
    });

    this.marker.setStyle(
      new Style({
        image: new Icon({
          src: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
          scale: 0.05,
        }),
      })
    );

    this.vectorSource = new VectorSource({
      features: [this.marker],
    });

    const vectorLayer = new VectorLayer({
      source: this.vectorSource,
    });

    this.map = new Map({
      target: 'map',
      controls: defaultControls(),
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        vectorLayer,
      ],
      view: new View({
        center: initialCoords,
        zoom: 15,
      }),
    });

    // ✅ Manejar clics en el mapa con actualización de dirección
    this.map.on('click', async (evt) => {
      const coordinate = toLonLat(evt.coordinate);
      this.lon = coordinate[0];
      this.lat = coordinate[1];

      this.marker.setGeometry(new Point(evt.coordinate));

      await this.obtenerDireccion(this.lat!, this.lon!);
    });
  }

  onProvinciaChange() {
    const provincia = this.provincias.find(p => p.nombre === this.provinciaSeleccionada);
    this.ciudadesFiltradas = provincia ? provincia.ciudades : [];
    this.ciudadSeleccionada = null;
  }

  async centrarEnCiudad() {
    if (!this.ciudadSeleccionada) return;

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?city=${this.ciudadSeleccionada}&country=Ecuador&format=json`);
      const data = await response.json();

      if (data && data.length > 0) {
        this.lat = parseFloat(data[0].lat);
        this.lon = parseFloat(data[0].lon);

        const center = fromLonLat([this.lon!, this.lat!]);

        this.marker.setGeometry(new Point(center));
        this.map.getView().animate({ center, zoom: 14 });

        await this.obtenerDireccion(this.lat, this.lon);
      }
    } catch (error) {
      console.error('Error al centrar en ciudad:', error);
    }
  }

  async obtenerDireccion(lat: number, lon: number) {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await response.json();
      this.direccion = data.display_name || 'Dirección no encontrada';
    } catch (error) {
      this.direccion = 'No se pudo obtener dirección';
      console.error('Error al obtener dirección:', error);
    }
  }

  guardarUbicacion() {
    if (!this.usuarioSeleccionado) {
      alert('Por favor selecciona un usuario antes de guardar.');
      return;
    }

    const usuario = this.usuarios.find(u => u.id === this.usuarioSeleccionado);
    const ubicacion = {
      usuarioId: usuario?.id,
      nombre: usuario?.nombre,
      latitud: this.lat,
      longitud: this.lon,
      direccion: this.direccion,
    };

    console.log('✅ Ubicación asignada:', ubicacion);

    // Aquí puedes integrar con tu backend NestJS
  }
}

import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Icon, Style } from 'ol/style';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle, IonContent,
  IonHeader,
  IonTitle,
  IonToolbar
} from "@ionic/angular/standalone";

@Component({
  selector: 'app-ubicacion',
  templateUrl: './ubicacion.page.html',
  styleUrls: ['./ubicacion.page.scss'],
  standalone: true,
  imports: [
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonCard,
    IonToolbar,
    IonTitle,
    IonHeader,
    IonContent
  ],
})
export class UbicacionPage implements OnInit, AfterViewInit {
  lat: number | null = null;
  lon: number | null = null;
  direccion: string = '';
  map!: Map;

  constructor() {}

  async ngOnInit() {
    await this.obtenerUbicacion();
  }

  ngAfterViewInit() {
    // Esperamos que la ubicación se cargue primero
    if (this.lat && this.lon) {
      this.mostrarMapa();
    }
  }

  async obtenerUbicacion() {
    try {
      const position = await Geolocation.getCurrentPosition();
      this.lat = position.coords.latitude;
      this.lon = position.coords.longitude;
      this.obtenerDireccion(this.lat, this.lon);
      setTimeout(() => this.mostrarMapa(), 300); // Esperar un poco para renderizar el mapa
    } catch (error) {
      console.error('Error al obtener ubicación:', error);
    }
  }

  mostrarMapa() {
    const coords = fromLonLat([this.lon!, this.lat!]);

    const marker = new Feature({
      geometry: new Point(coords),
    });

    marker.setStyle(
      new Style({
        image: new Icon({
          src: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
          scale: 0.05,
        }),
      })
    );

    const vectorLayer = new VectorLayer({
      source: new VectorSource({
        features: [marker],
      }),
    });

    this.map = new Map({
      target: 'map',
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        vectorLayer,
      ],
      view: new View({
        center: coords,
        zoom: 16,
      }),
    });
  }

  async obtenerDireccion(lat: number, lon: number) {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
    const data = await response.json();
    this.direccion = data.display_name || 'Dirección no encontrada';
  }
}

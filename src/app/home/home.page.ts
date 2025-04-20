import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage {
  busqueda: string = '';
  usuario: any = {
    nombre: 'Jessica Tituaña',
    foto: 'https://randomuser.me/api/portraits/women/44.jpg',
    diasLaborados: 15,
    faltas: 2,
    atrasos: 3,
    registros: [
      {
        estado: 'Entrada',
        entrada: '01-04-2025 08:00 am',
        salida: '',
        mapa: true
      }
    ]
  };

  buscarUsuario() {
    console.log('Buscando:', this.busqueda);
    // Aquí podrías hacer una llamada al backend para buscar usuarios.
  }
}

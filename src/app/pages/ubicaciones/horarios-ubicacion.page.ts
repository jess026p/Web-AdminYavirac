import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-horarios-ubicacion',
  templateUrl: './horarios-ubicacion.page.html',
  styleUrls: ['./horarios-ubicacion.page.scss'],
})
export class HorariosUbicacionPage implements OnInit {
  horarioForm: FormGroup;
  horarios: any[] = [];
  diasSemana = [
    { nombre: 'Lunes', valor: 1 },
    { nombre: 'Martes', valor: 2 },
    { nombre: 'Miércoles', valor: 3 },
    { nombre: 'Jueves', valor: 4 },
    { nombre: 'Viernes', valor: 5 },
    { nombre: 'Sábado', valor: 6 },
    { nombre: 'Domingo', valor: 0 }
  ];

  constructor(
    private fb: FormBuilder,
    private alertController: AlertController
  ) {
    this.horarioForm = this.fb.group({
      horaInicio: ['', Validators.required],
      horaFin: ['', Validators.required],
      dias: [[], Validators.required],
      radio: [100, Validators.required]
    });
  }

  ngOnInit() {}

  agregarHorario() {
    if (this.horarioForm.valid) {
      const nuevoHorario = {
        ...this.horarioForm.value,
        id: Date.now()
      };
      this.horarios.push(nuevoHorario);
      this.horarioForm.reset();
    }
  }

  eliminarHorario(id: number) {
    this.horarios = this.horarios.filter(h => h.id !== id);
  }

  async mostrarAlerta(titulo: string, mensaje: string) {
    const alert = await this.alertController.create({
      header: titulo,
      message: mensaje,
      buttons: ['OK']
    });
    await alert.present();
  }
} 
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IonicModule, ModalController, AlertController, ToastController } from '@ionic/angular';
import { Usuario, Role } from 'src/app/services/usuarios.service';

@Component({
  selector: 'app-formulario-usuario',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, FormsModule],
  templateUrl: './formulario-usuario.component.html',
  styleUrls: ['./formulario-usuario.component.scss']
})
export class FormularioUsuarioComponent implements OnInit {
  @Input() usuario: Usuario | null = null;
  @Input() editMode: boolean = false;
  @Input() roles: Role[] = [];

  form!: FormGroup;

  get userForm(): FormGroup {
    return this.form;
  }

  constructor(
    private fb: FormBuilder,
    private modalController: ModalController,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    const defaultValues = {
      id: null,
      username: '',
      name: '',
      lastname: '',
      email: '',
      password: '',
      identification: '',
      identificationType: 'cedula',
      roles: [],
      passwordChanged: true
    };

    const initialValues = {
      ...defaultValues,
      ...this.usuario,
      password: '' // Nunca mostramos la contraseña real
    };

    this.form = this.fb.group({
      id: [initialValues.id],
      username: [initialValues.username, [Validators.required]],
      name: [initialValues.name, [Validators.required]],
      lastname: [initialValues.lastname, [Validators.required]],
      email: [initialValues.email, [Validators.required, Validators.email]],
      identification: [initialValues.identification, [Validators.required]],
      identificationType: [initialValues.identificationType?.toLowerCase() || 'cedula', [Validators.required]],
      password: [
        initialValues.password,
        this.editMode ? [] : [Validators.required, Validators.minLength(6)]
      ],
      roles: [initialValues.roles, [Validators.required]],
      passwordChanged: [initialValues.passwordChanged ?? true]
    });
  }

  cancel() {
    this.modalController.dismiss();
  }

  async saveUser() {
    if (this.form.invalid) {
      const alert = await this.alertController.create({
        header: 'Formulario incompleto',
        message: 'Por favor complete todos los campos obligatorios.',
        buttons: ['Aceptar']
      });
      await alert.present();
      return;
    }

    const rawData = this.form.value;

    const usuarioData: any = {
      ...rawData,
      identificationType: rawData.identificationType?.toLowerCase(),
      roles: rawData.roles.map((r: any) => typeof r === 'object' ? r.id : r)
    };

    if (!usuarioData.id) delete usuarioData.id;
    if (this.editMode && !usuarioData.password) {
      delete usuarioData.password;
    }

    console.log('Datos a enviar al backend:', usuarioData);

    this.modalController.dismiss({ usuario: usuarioData });
  }

  async showMessage(msg: string) {
    const toast = await this.toastController.create({
      message: msg,
      duration: 3000,
      color: 'dark',
      position: 'bottom'
    });
    await toast.present();
  }
}
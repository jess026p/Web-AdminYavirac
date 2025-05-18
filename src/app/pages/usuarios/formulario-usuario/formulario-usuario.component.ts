import { Component, Input, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IonicModule, ModalController, AlertController, ToastController } from '@ionic/angular';
import { Usuario, Role, UsuariosService } from 'src/app/services/usuarios.service';

@Component({
  selector: 'app-formulario-usuario',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, FormsModule],
  providers: [FormBuilder, ToastController],
  templateUrl: './formulario-usuario.component.html',
  styleUrls: ['./formulario-usuario.component.scss']
})
export class FormularioUsuarioComponent implements OnInit {
  @Input() usuario: Usuario | null = null;
  @Input() editMode: boolean = false;

  form!: FormGroup;
  catalogosIdentificacion: any[] = [];
  catalogosGenero: any[] = [];

  get userForm(): FormGroup {
    return this.form;
  }

  constructor(
    @Inject(FormBuilder) private fb: FormBuilder,
    private modalController: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
    private usuariosService: UsuariosService
  ) {}

  async ngOnInit() {
    // Cargar ambos catálogos en paralelo
    const [catalogosIdentificacion, catalogosGenero] = await Promise.all([
      this.usuariosService.obtenerCatalogosIdentificacion().toPromise(),
      this.usuariosService.obtenerCatalogosGenero().toPromise()
    ]);
    this.catalogosIdentificacion = catalogosIdentificacion || [];
    this.catalogosGenero = catalogosGenero || [];

    const defaultValues = {
      id: null,
      username: '',
      name: '',
      lastname: '',
      email: '',
      password: '',
      identification: '',
      identificationType: this.catalogosIdentificacion[0] || null,
      passwordChanged: true,
      gender: null,
      birthdate: null,
      cellPhone: ''
    };

    let initialValues = {
      ...defaultValues,
      ...this.usuario,
      password: '' // Nunca mostramos la contraseña real
    };
    

    // Asegura que identificationType sea SIEMPRE un objeto completo del catálogo
    if (initialValues.identificationType && typeof initialValues.identificationType === 'object' && initialValues.identificationType.id) {
      const found = this.catalogosIdentificacion.find(cat => cat.id === initialValues.identificationType.id);
      initialValues.identificationType = found || this.catalogosIdentificacion[0];
    } else if (typeof initialValues.identificationType === 'string') {
      const found = this.catalogosIdentificacion.find(cat => cat.id === initialValues.identificationType);
      initialValues.identificationType = found || this.catalogosIdentificacion[0];
    } else {
      initialValues.identificationType = this.catalogosIdentificacion[0];
    }

    this.form = this.fb.group({
      id: [initialValues.id],
      username: [initialValues.username, [Validators.required]],
      name: [initialValues.name, [Validators.required, Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/), Validators.minLength(2)]],
      lastname: [initialValues.lastname, [Validators.required, Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/), Validators.minLength(2)]],
      email: [initialValues.email, [Validators.required, Validators.email]],
      identification: [initialValues.identification, [Validators.required, Validators.pattern(/^[0-9]+$/), Validators.minLength(8)]],
      identificationType: [
        initialValues.identificationType && typeof initialValues.identificationType === 'object' && 'id' in initialValues.identificationType
          ? (initialValues.identificationType as { id: string }).id
          : initialValues.identificationType,
        this.editMode ? [] : [Validators.required]
      ],
      gender: [
        initialValues.gender && typeof initialValues.gender === 'object' && 'id' in initialValues.gender
          ? (initialValues.gender as { id: string }).id
          : initialValues.gender,
        this.editMode ? [] : [Validators.required]
      ],
      birthdate: [initialValues.birthdate || null, [Validators.required]],
      cellPhone: [initialValues.cellPhone || '', [Validators.required, Validators.pattern(/^[0-9]{9,15}$/)]],
      password: [
        initialValues.password,
        this.editMode ? [] : [Validators.required, Validators.minLength(6)]
      ],
      passwordChanged: [initialValues.passwordChanged ?? true]
    });

    // Si es edición, aseguramos que los selects tengan el id correcto
    if (this.editMode && this.usuario) {
      this.form.patchValue({
        gender: typeof this.usuario.gender === 'object' && this.usuario.gender !== null ? (this.usuario.gender as { id: string }).id : this.usuario.gender ?? null,
        identificationType: typeof this.usuario.identificationType === 'object' && this.usuario.identificationType !== null ? (this.usuario.identificationType as { id: string }).id : this.usuario.identificationType ?? null
      });
    }
  }

  cancel() {
    this.modalController.dismiss();
  }

  async saveUser() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this.showMessage('Por favor, corrige los errores antes de guardar.');
      return;
    }

    const rawData = this.form.value;
    const usuarioData: any = {
      ...rawData,
      // Si el campo no está en el formulario, usa el valor original (nunca null)
      identificationType: this.editMode ? (this.usuario?.identificationType) : rawData.identificationType,
      gender: this.editMode ? (this.usuario?.gender) : rawData.gender,
      birthdate: rawData.birthdate,
      cellPhone: rawData.cellPhone || null
    };

    // Eliminar campos que no deben ir en el payload
    if ('id' in usuarioData) delete usuarioData.id;
    if ('genderId' in usuarioData) delete usuarioData.genderId;
    if (this.editMode && !usuarioData.password) {
      delete usuarioData.password;
    }

    console.log('Datos a enviar al backend:', usuarioData);
    // Devuelve el usuario con id (si existe) para que la página lo use en la URL
    this.modalController.dismiss({ usuario: { ...usuarioData, id: this.usuario?.id } });
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

  getNombreCatalogo(valor: any): string | null {
    return valor && typeof valor === 'object' && 'name' in valor ? valor.name : null;
  }
}
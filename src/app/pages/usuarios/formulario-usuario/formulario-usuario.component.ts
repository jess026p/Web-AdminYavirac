import { Component, Input, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, AsyncValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { IonicModule, ModalController, AlertController, ToastController } from '@ionic/angular';
import { Usuario, UsuariosService } from 'src/app/services/usuarios.service';
import Swal from 'sweetalert2';
import { RolesService, Role } from 'src/app/services/roles.service';
import { Observable, of } from 'rxjs';
import { map, debounceTime, switchMap, first, catchError } from 'rxjs/operators';

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
  roles: Role[] = [];
  puedeGuardar: boolean = true;
  verificandoUsuarioOCorreo: boolean = false;
  private alertRef: HTMLIonAlertElement | null = null;
  private alertAbierto: boolean = false;

  get userForm(): FormGroup {
    return this.form;
  }

  constructor(
    @Inject(FormBuilder) private fb: FormBuilder,
    private modalController: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
    private usuariosService: UsuariosService,
    private rolesService: RolesService
  ) {}

  async ngOnInit() {
    console.log('Usuario recibido para editar en el modal:', this.usuario);
    // Cargar ambos catálogos en paralelo
    const [catalogosIdentificacion, catalogosGenero] = await Promise.all([
      this.usuariosService.obtenerCatalogosIdentificacion().toPromise(),
      this.usuariosService.obtenerCatalogosGenero().toPromise()
    ]);
    this.catalogosIdentificacion = catalogosIdentificacion || [];
    this.catalogosGenero = catalogosGenero || [];

    this.roles = await this.rolesService.obtenerRoles();

    const defaultValues = {
      id: null,
      username: '',
      name: '',
      lastname: '',
      email: '',
      password: '',
      identification: '',
      identificationType: this.catalogosIdentificacion[0] || null,
      passwordChanged: false,
      gender: null,
      birthdate: null,
      cellPhone: '',
      role_id: null as string | null
    };

    let initialValues = {
      ...defaultValues,
      ...this.usuario,
      password: '' // Nunca mostramos la contraseña real
    };
    
    // Si el usuario tiene roles, asigna el id del primer rol a initialValues.role_id
    if (this.usuario && Array.isArray(this.usuario.roles) && this.usuario.roles.length > 0) {
      initialValues.role_id = this.usuario.roles[0].id;
    }

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
      identification: [initialValues.identification, [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
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
      cellPhone: [initialValues.cellPhone || '', [Validators.required, Validators.pattern(/^[0-9]{9,10}$/)]],
      password: [
        initialValues.password,
        this.editMode ? [] : [Validators.required, Validators.minLength(6)]
      ],
      passwordChanged: [initialValues.passwordChanged ?? true],
      role_id: [initialValues.role_id as string | null, Validators.required]
    });

    // Validación en blur con SweetAlert2
    if (!this.editMode) {
      this.setupBlurValidation();
    }

    // Si es edición, aseguramos que los selects tengan el id correcto
    if (this.editMode && this.usuario) {
      this.form.patchValue({
        gender: typeof this.usuario.gender === 'object' && this.usuario.gender !== null ? (this.usuario.gender as { id: string }).id : this.usuario.gender ?? null,
        identificationType: typeof this.usuario.identificationType === 'object' && this.usuario.identificationType !== null ? (this.usuario.identificationType as { id: string }).id : this.usuario.identificationType ?? null
      });
    }

    // Mostrar alert cuando el validador asíncrono detecte existencia
    this.form.get('username')?.statusChanges.subscribe(() => {
      const control = this.form.get('username');
      if (control?.hasError('existe') && (control.dirty || control.touched)) {
        this.mostrarAlerta('El nombre de usuario ya existe');
      }
    });
    this.form.get('email')?.statusChanges.subscribe(() => {
      const control = this.form.get('email');
      if (control?.hasError('existe') && (control.dirty || control.touched)) {
        this.mostrarAlerta('El correo electrónico ya existe');
      }
    });

    // Limpio el error 'existe' cuando el usuario cambia el valor manualmente
    this.form.get('username')?.valueChanges.subscribe(() => {
      const control = this.form.get('username');
      if (control?.hasError('existe')) {
        const errors = { ...control.errors };
        delete errors['existe'];
        control.setErrors(Object.keys(errors).length ? errors : null);
      }
    });
    this.form.get('email')?.valueChanges.subscribe(() => {
      const control = this.form.get('email');
      if (control?.hasError('existe')) {
        const errors = { ...control.errors };
        delete errors['existe'];
        control.setErrors(Object.keys(errors).length ? errors : null);
      }
    });
  }

  setupBlurValidation() {
    const fields = [
      { key: 'name', label: 'Nombre', errors: {
        required: 'El nombre es obligatorio',
        pattern: 'Solo se permiten letras',
        minlength: 'Mínimo 2 caracteres'
      } },
      { key: 'lastname', label: 'Apellido', errors: {
        required: 'El apellido es obligatorio',
        pattern: 'Solo se permiten letras',
        minlength: 'Mínimo 2 caracteres'
      } },
      { key: 'identification', label: 'Identificación', errors: {
        required: 'La identificación es obligatoria',
        pattern: 'La identificación debe tener exactamente 10 números'
      } },
      { key: 'cellPhone', label: 'Celular', errors: {
        required: 'El número de celular es obligatorio',
        pattern: 'El número de celular debe tener entre 9 y 15 dígitos'
      } },
      { key: 'birthdate', label: 'Fecha de nacimiento', errors: {
        required: 'La fecha de nacimiento es obligatoria'
      } },
      { key: 'username', label: 'Usuario', errors: {
        required: 'El usuario es obligatorio'
      } },
      { key: 'email', label: 'Correo electrónico', errors: {
        required: 'El correo es obligatorio',
        email: 'Formato de correo inválido'
      } },
      { key: 'password', label: 'Contraseña', errors: {
        required: 'La contraseña es obligatoria',
        minlength: 'Mínimo 6 caracteres'
      } },
    ];
    fields.forEach(field => {
      (this as any)[`onBlur_${field.key}`] = () => {
        const control = this.form.get(field.key);
        if (control && control.invalid) {
          const errorKey = Object.keys(control.errors || {})[0];
          if (errorKey && Object.prototype.hasOwnProperty.call(field.errors, errorKey)) {
            Swal.close();
            Swal.fire({
              toast: true,
              position: 'top',
              icon: 'warning',
              title: (field.errors as any)[errorKey],
              showConfirmButton: false,
              timer: 2000,
              timerProgressBar: true
            });
          }
        }
      };
    });
  }

  sugerirUsuarioYContrasena() {
    const nombre = this.form.get('name')?.value || '';
    const apellido = this.form.get('lastname')?.value || '';
    const identificacion = this.form.get('identification')?.value || '';
    let usuario = '';
    if (nombre && apellido && identificacion.length >= 3) {
      usuario = nombre.trim().charAt(0).toLowerCase() + apellido.trim().toLowerCase() + identificacion.slice(-3);
    }
    const contrasena = identificacion; // Ahora la contraseña es la cédula
    this.form.patchValue({ username: usuario, password: contrasena });
    Swal.fire({
      toast: true,
      position: 'top',
      icon: 'info',
      title: `Sugerido: Usuario: ${usuario}, Contraseña: ${contrasena}`,
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true
    });
  }

  cancel() {
    this.modalController.dismiss();
  }

  async saveUser() {
    this.form.get('username')?.setErrors(null);
    this.form.get('email')?.setErrors(null);

    // Validación previa
    const emailControl = this.form.get('email');
    if (emailControl?.hasError('email')) {
      const errors = { ...emailControl.errors };
      delete errors['email'];
      emailControl.setErrors(Object.keys(errors).length ? errors : null);
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this.mostrarAlerta('Por favor, corrige los errores antes de guardar.');
      return;
    }

    const rawData = { ...this.form.value };
    delete rawData.id;

    const usuarioData: any = {
      ...rawData,
      identificationType: this.editMode ? this.usuario?.identificationType : rawData.identificationType,
      gender: this.editMode ? this.usuario?.gender : rawData.gender,
    };

    if (this.editMode && !usuarioData.password) {
      delete usuarioData.password;
    }

    // Limpia el error 'existe' antes de guardar
    const usernameControl = this.form.get('username');
    if (usernameControl && usernameControl.hasError('existe')) {
      const errors = { ...usernameControl.errors };
      delete errors['existe'];
      usernameControl.setErrors(Object.keys(errors).length ? errors : null);
    }

    this.form.disable();
    const servicio = this.editMode
      ? this.usuariosService.actualizarUsuario(this.usuario!.id as string, usuarioData)
      : this.usuariosService.crearUsuario(usuarioData);

    servicio.subscribe({
      next: (res) => {
        this.form.enable();
        this.modalController.dismiss({
          usuario: { ...usuarioData, id: this.editMode ? this.usuario!.id : res.id },
        });
      },
      error: async (err) => {
        this.form.enable();
        let mensaje = '';
        if (err.error && Array.isArray(err.error.message)) {
          mensaje = err.error.message.join(', ');
        } else if (typeof err.error?.message === 'string') {
          mensaje = err.error.message;
        } else if (typeof err.error === 'string') {
          mensaje = err.error;
        } else if (Array.isArray(err.error)) {
          mensaje = err.error.join(', ');
        } else if (err.status === 0) {
          mensaje = 'No se pudo conectar con el servidor.';
        } else if (typeof err.message === 'string') {
          mensaje = err.message;
        }
        if (!mensaje) {
          mensaje = 'Ocurrió un error inesperado.';
        }
        await this.mostrarAlerta(mensaje);
      }
    });
  }

  getNombreCatalogo(valor: any): string | null {
    return valor && typeof valor === 'object' && 'name' in valor ? valor.name : null;
  }

  // Métodos de blur para cada campo (declarados para evitar error de linter)
  onBlur_name() {}
  onBlur_lastname() {}
  onBlur_identification() {}
  onBlur_cellPhone() {}
  onBlur_birthdate() {}
  onBlur_username() {}
  onBlur_email() {}
  onBlur_password() {}

  // Métodos para filtrar caracteres permitidos en inputs
  filtrarSoloNumeros(event: any, maxLength: number) {
    let valor = event.target.value.replace(/[^0-9]/g, '');
    if (valor.length > maxLength) valor = valor.slice(0, maxLength);
    event.target.value = valor;
    const controlName = event.target.getAttribute('formcontrolname');
    if (controlName && this.form.get(controlName)) {
      this.form.get(controlName)?.setValue(valor, { emitEvent: false });
    }
  }

  filtrarSoloLetras(event: any) {
    let valor = event.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '');
    event.target.value = valor;
    const controlName = event.target.getAttribute('formcontrolname');
    if (controlName && this.form.get(controlName)) {
      this.form.get(controlName)?.setValue(valor, { emitEvent: false });
    }
  }

  // Función para verificar usuario existente
  async verificarUsuarioExistente() {
    const username = this.form.get('username')?.value;
    if (!username) return;
    this.usuariosService.verificarUsuario(username).subscribe({
      next: async (res: any) => {
        let existe = false;
        if (res && typeof res === 'object') {
          if ('data' in res && res.data && typeof res.data === 'object' && 'exists' in res.data) {
            existe = !!res.data.exists;
          } else if ('exists' in res) {
            existe = !!res.exists;
          }
        }
        const control = this.form.get('username');
        if (existe) {
          control?.setErrors({ ...control.errors, existe: true });
          await this.mostrarAlerta('El nombre de usuario ya existe');
        } else {
          // Limpio el error 'existe' si ya no existe
          if (control?.hasError('existe')) {
            const errors = { ...control.errors };
            delete errors['existe'];
            control.setErrors(Object.keys(errors).length ? errors : null);
          }
        }
      }
    });
  }

  // Función para verificar correo existente
  async verificarCorreoExistente() {
    const email = this.form.get('email')?.value;
    if (!email) return;
    this.usuariosService.verificarCorreo(email).subscribe({
      next: async (res: any) => {
        let existe = false;
        if (res && typeof res === 'object') {
          if ('data' in res && res.data && typeof res.data === 'object' && 'exists' in res.data) {
            existe = !!res.data.exists;
          } else if ('exists' in res) {
            existe = !!res.exists;
          }
        }
        const control = this.form.get('email');
        if (existe) {
          control?.setErrors({ ...control.errors, existe: true });
          await this.mostrarAlerta('El correo electrónico ya existe');
        } else {
          // Limpio el error 'existe' si ya no existe
          if (control?.hasError('existe')) {
            const errors = { ...control.errors };
            delete errors['existe'];
            control.setErrors(Object.keys(errors).length ? errors : null);
          }
        }
      }
    });
  }

  async mostrarAlerta(mensaje: string) {
    // Si ya hay un alert abierto, no muestres otro
    if (this.alertAbierto) return;
    this.alertAbierto = true;
    if (this.alertRef) {
      try {
        await this.alertRef.dismiss();
      } catch (e) {}
      this.alertRef = null;
    }
    const alert = await this.alertController.create({
      header: 'Error',
      message: mensaje,
      buttons: [{
        text: 'Aceptar',
        handler: () => {
          if (this.alertRef) {
            this.alertRef.dismiss();
            this.alertRef = null;
          }
          this.alertAbierto = false;
        }
      }],
      cssClass: 'custom-alert-error',
      backdropDismiss: false
    });
    this.alertRef = alert;
    await alert.present();
  }

  async mostrarAlertaEmailInvalido() {
    const emailControl = this.form.get('email');
    if (emailControl && emailControl.invalid && emailControl.hasError('email')) {
      await this.mostrarAlerta('El correo electrónico no tiene un formato válido.');
    }
  }
}
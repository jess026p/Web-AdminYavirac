// formulario-usuario.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ModalController, ToastController } from '@ionic/angular';
import { UsuariosService, Usuario, Role } from 'src/app/services/usuarios.service';
import { RolesService } from 'src/app/services/roles.service';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-formulario-usuario',
  templateUrl: './formulario-usuario.component.html',
  styleUrls: ['./formulario-usuario.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class FormularioUsuarioComponent implements OnInit {
  @Input() usuario?: Usuario;
  @Input() roles: Role[] = [];
  
  form!: FormGroup;
  modoEdicion = false;
  cargando = false;
  
  // Alias para HTML (para compatibilidad con el template)
  get userForm(): FormGroup {
    return this.form;
  }
  
  get editMode(): boolean {
    return this.modoEdicion;
  }
  
  constructor(
    private fb: FormBuilder,
    private usuariosService: UsuariosService,
    private rolesService: RolesService,
    private modalController: ModalController,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.modoEdicion = !!this.usuario;
    
    // Verificar formato de los roles recibidos del componente padre
    console.log('Roles disponibles:', this.roles);
    if (this.usuario) {
      console.log('Roles del usuario a editar:', this.usuario.roles);
    }
    
    this.inicializarFormulario();
  }

  private inicializarFormulario() {
    // Valores por defecto
    const defaultValues: Partial<Usuario> = {
      id: undefined,
      username: '',
      name: '',
      lastname: '',
      email: '',
      identification: '',
      password: '',
      roles: []
    };
    
    // Si estamos en modo edición, usamos los valores del usuario
    let initialValues = defaultValues;
    if (this.usuario) {
      // Crear una copia profunda para no modificar el objeto original
      initialValues = {
        ...defaultValues,
        ...JSON.parse(JSON.stringify(this.usuario)),
        // No incluir la contraseña si es modo edición
        password: ''
      };
      
      // Asegurarse de que roles sea un array de IDs para el formulario
      if (initialValues.roles && Array.isArray(initialValues.roles)) {
        // Extraer los IDs si son objetos completos
        initialValues.roles = initialValues.roles.map((rol: any) => 
          typeof rol === 'object' && rol !== null ? rol.id : rol
        );
      }
    }
    
    console.log('Valores iniciales del formulario:', initialValues);
    
    this.form = this.fb.group({
      id: [initialValues.id],
      username: [initialValues.username, [Validators.required]],
      name: [initialValues.name, [Validators.required]],
      lastname: [initialValues.lastname, [Validators.required]],
      email: [initialValues.email, [Validators.required, Validators.email]],
      identification: [initialValues.identification, [Validators.required]],
      password: [initialValues.password, this.modoEdicion ? [] : [Validators.required]],
      roles: [initialValues.roles, [Validators.required]]
    });
  }

  async loadRoles() {
    try {
      console.log('Cargando roles disponibles...');
      this.roles = await this.rolesService.obtenerRoles();
      console.log('Roles cargados:', this.roles);
      
      // Si no se pudieron cargar los roles, usar valores predeterminados
      if (!this.roles || this.roles.length === 0) {
        console.warn('No se pudieron cargar roles. Usando valores predeterminados');
        this.roles = [
          { id: '1', name: 'Administrador', code: 'admin' },
          { id: '2', name: 'Empleado', code: 'employee' }
        ];
      }
    } catch (error) {
      console.error('Error al cargar roles:', error);
      this.showMessage('Error al cargar roles. Usando valores predeterminados');
      
      // Usar roles predeterminados en caso de error
      this.roles = [
        { id: '1', name: 'Administrador', code: 'admin' },
        { id: '2', name: 'Empleado', code: 'employee' }
      ];
    }
  }

  // Alias para el método que llama la vista
  cancel(): void {
    this.cancelar();
  }
  
  // Alias para el método saveUser que llama la vista
  saveUser(): Promise<void> {
    return this.guardar();
  }

  async guardar() {
    if (this.form.invalid) {
      // Mostrar los errores de validación
      const alert = await this.alertController.create({
        header: 'Formulario inválido',
        message: 'Por favor, completa todos los campos requeridos correctamente.',
        buttons: ['OK']
      });
      await alert.present();
      
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.form.controls).forEach(key => {
        const control = this.form.get(key);
        control?.markAsTouched();
      });
      
      return;
    }
    
    // Crear una copia de los datos del formulario para no afectar al formulario original
    const usuarioData = {...this.form.value};
    
    // Asegurarse de que los roles sean solo IDs antes de enviar
    if (usuarioData.roles && Array.isArray(usuarioData.roles)) {
      usuarioData.roles = usuarioData.roles.map((rol: any) => 
        typeof rol === 'object' && rol !== null ? rol.id : rol
      );
    }
    
    // Si no se cambia la contraseña en modo edición, eliminarla del objeto
    if (this.modoEdicion && !usuarioData.password) {
      delete usuarioData.password;
    }
    
    console.log('Datos del usuario a enviar:', usuarioData);
    
    this.modalController.dismiss({
      usuario: usuarioData
    });
  }

  cancelar() {
    this.modalController.dismiss();
  }

  async showMessage(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: 'dark'
    });
    toast.present();
  }
}
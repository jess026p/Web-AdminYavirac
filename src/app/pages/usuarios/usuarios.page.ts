import { Component, OnInit } from '@angular/core';
import { IonicModule, AlertController, LoadingController, ToastController, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UsuariosService, Usuario, Role } from '../../services/usuarios.service';
import { FormularioUsuarioComponent } from './formulario-usuario/formulario-usuario.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, ReactiveFormsModule],
  templateUrl: './usuarios.page.html',
  styleUrls: ['./usuarios.page.scss'],
})
export class UsuariosPage implements OnInit {
  busqueda = '';
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  cargando = false;

  constructor(
    private usuariosService: UsuariosService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.cargarUsuarios();
  }

  async cargarUsuarios() {
    const loading = await this.loadingController.create({
      message: 'Cargando usuarios...',
    });
    await loading.present();
    
    // Mostrar en la consola la URL que se está utilizando
    console.log('Intentando cargar usuarios desde:', this.usuariosService.getApiUrl());
    
    this.usuariosService.obtenerUsuarios().subscribe({
      next: (data: any) => {
        console.log('Respuesta del backend para usuarios:', data);
        
        // Adaptar los datos recibidos a nuestro formato de Usuario
        if (data && data.data && Array.isArray(data.data)) {
          this.usuarios = data.data.map((usuario: any) => ({
            id: usuario.id,
            username: usuario.username,
            name: usuario.name,
            lastname: usuario.lastname,
            email: usuario.email || '',
            identification: usuario.identification || '',
            roles: usuario.roles || []
          }));
        } else if (Array.isArray(data)) {
          // Si la respuesta es directamente un array
          this.usuarios = data.map((usuario: any) => ({
            id: usuario.id,
            username: usuario.username,
            name: usuario.name,
            lastname: usuario.lastname,
            email: usuario.email || '',
            identification: usuario.identification || '',
            roles: usuario.roles || []
          }));
        } else {
          this.usuarios = data;
        }
        
        console.log('Usuarios procesados:', this.usuarios);
        this.usuariosFiltrados = [...this.usuarios];
        loading.dismiss();
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
        
        // Si es un error de autenticación, mostrar mensaje específico
        if (error.status === 401) {
          this.mostrarMensaje('No tienes autorización para acceder a los usuarios. Necesitas permisos de ADMIN.', 'danger');
        } else {
          this.mostrarMensaje(`No se pudo conectar al servidor: ${error.message}`, 'warning');
        }
        
        // Usar datos locales como fallback
        this.usuarios = [
          { 
            id: '1', 
            username: 'anamora', 
            name: 'Ana', 
            lastname: 'Mora', 
            email: 'ana@correo.com',
            identification: '1234567890',
            roles: [{ id: '1', name: 'Admin', code: 'admin' }]
          },
          { 
            id: '2', 
            username: 'luisperez', 
            name: 'Luis', 
            lastname: 'Pérez', 
            email: 'luis@correo.com',
            identification: '0987654321',
            roles: [{ id: '2', name: 'Empleado', code: 'employee' }]
          },
        ];
        this.usuariosFiltrados = [...this.usuarios];
        
        console.log('Intentando conectarse a:', this.usuariosService.getApiUrl());
        
        loading.dismiss();
      }
    });
  }

  async abrirFormulario(usuario?: Usuario) {
    // Primero cargar los roles disponibles
    let roles: Role[] = [];
    
    try {
      // Intenta obtener los roles del backend usando firstValueFrom en lugar de toPromise
      const rolesData: any = await firstValueFrom(this.usuariosService.obtenerRoles());
      console.log("Roles obtenidos del servidor:", rolesData);
      roles = rolesData.data || [];
    } catch (error) {
      console.error('Error al cargar roles:', error);
      // Roles de prueba si hay error
      roles = [
        { id: '1', name: 'Administrador', code: 'admin' },
        { id: '2', name: 'Empleado', code: 'employee' }
      ];
      this.mostrarMensaje('No se pudieron cargar los roles del servidor', 'warning');
    }

    // Verificar si los roles son un array válido
    if (!Array.isArray(roles) || roles.length === 0) {
      console.warn('No se pudieron cargar roles o el array está vacío. Usando roles predeterminados');
      roles = [
        { id: '1', name: 'Administrador', code: 'admin' },
        { id: '2', name: 'Empleado', code: 'employee' }
      ];
    }

    console.log('Roles disponibles para el formulario:', roles);

    const modal = await this.modalController.create({
      component: FormularioUsuarioComponent,
      componentProps: {
        usuario: usuario,
        roles: roles
      },
      cssClass: 'usuario-modal',
      backdropDismiss: false,
      // Configurar el tamaño del modal para hacerlo más compacto
      breakpoints: [0, 0.3, 0.5, 1],
      initialBreakpoint: 0.5
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    
    if (data && data.usuario) {
      // Asegurarse de que los roles estén correctamente formateados
      if (data.usuario.roles && Array.isArray(data.usuario.roles)) {
        console.log('Roles a procesar:', data.usuario.roles);
        // Convertir a formato correcto si es necesario
        data.usuario.roles = data.usuario.roles.map((rol: any) => 
          typeof rol === 'object' && rol !== null ? rol.id : rol
        );
      }
      
      console.log('Datos del usuario a guardar:', data.usuario);
      
      if (usuario) {
        this.actualizarUsuario(data.usuario);
      } else {
        this.crearUsuario(data.usuario);
      }
    }
  }

  editarUsuario(usuario: Usuario) {
    this.abrirFormulario(usuario);
  }

  async crearUsuario(usuario: Usuario) {
    const loading = await this.loadingController.create({
      message: 'Guardando usuario...',
    });
    await loading.present();

    console.log('Datos de usuario a enviar para crear:', usuario);

    // Convertir el usuario al formato esperado por el backend
    this.usuariosService.crearUsuario(usuario as any).subscribe({
      next: (response: any) => {
        console.log('Respuesta al crear usuario:', response);
        const nuevoUsuario = response.data || response;
        this.usuarios.push(nuevoUsuario);
        this.filtrarUsuarios();
        this.mostrarMensaje('Usuario creado correctamente', 'success');
        loading.dismiss();
      },
      error: (error) => {
        console.error('Error al crear usuario:', error);
        
        // Mensajes específicos según el error
        if (error.status === 422) {
          // Error de validación - mostrar detalles
          const mensajeError = error.error?.message || 'Error de validación en los datos enviados';
          this.mostrarMensaje(mensajeError, 'danger');
        } else if (error.status === 401) {
          // Error de autenticación
          this.mostrarMensaje('No tienes autorización para crear usuarios', 'danger');
        } else {
          // Otro tipo de error
          this.mostrarMensaje('Error al crear el usuario: ' + (error.message || 'Error de conexión'), 'danger');
        }
        
        loading.dismiss();
      }
    });
  }

  async actualizarUsuario(usuario: Usuario) {
    if (!usuario.id) {
      this.mostrarMensaje('Error: No se puede actualizar un usuario sin ID', 'danger');
      return;
    }
    
    const loading = await this.loadingController.create({
      message: 'Actualizando usuario...',
    });
    await loading.present();

    // Convertir el usuario al formato esperado por el backend
    this.usuariosService.actualizarUsuario(usuario as any).subscribe({
      next: (response: any) => {
        const usuarioActualizado = response.data || response;
        const index = this.usuarios.findIndex(u => u.id === usuario.id);
        if (index !== -1) {
          this.usuarios[index] = usuarioActualizado;
          this.filtrarUsuarios();
        }
        this.mostrarMensaje('Usuario actualizado correctamente', 'success');
        loading.dismiss();
      },
      error: (error) => {
        console.error('Error al actualizar usuario:', error);
        // Si hay error, actualizar localmente
        const index = this.usuarios.findIndex(u => u.id === usuario.id);
        if (index !== -1) {
          this.usuarios[index] = usuario;
          this.filtrarUsuarios();
        }
        this.mostrarMensaje('Error al conectar con el servidor. Usuario actualizado localmente.', 'warning');
        loading.dismiss();
      }
    });
  }

  async eliminarUsuario(id: string) {
    if (!id) {
      this.mostrarMensaje('Error: ID de usuario no válido', 'danger');
      return;
    }
    
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: '¿Está seguro de que desea eliminar este usuario?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Eliminando usuario...',
            });
            await loading.present();

            // Ya no necesitamos convertir id a número
            this.usuariosService.eliminarUsuario(id).subscribe({
              next: () => {
                this.usuarios = this.usuarios.filter(u => u.id !== id);
                this.filtrarUsuarios();
                this.mostrarMensaje('Usuario eliminado correctamente', 'success');
                loading.dismiss();
              },
              error: (error) => {
                console.error('Error al eliminar usuario:', error);
                // Eliminar localmente si hay error de conexión
    this.usuarios = this.usuarios.filter(u => u.id !== id);
    this.filtrarUsuarios();
                this.mostrarMensaje('Error al conectar con el servidor. Usuario eliminado localmente.', 'warning');
                loading.dismiss();
              }
            });
          }
        }
      ]
    });

    await alert.present();
  }

  filtrarUsuarios() {
    const filtro = this.busqueda.toLowerCase();
    this.usuariosFiltrados = this.usuarios.filter(u =>
      `${u.name} ${u.lastname} ${u.username} ${u.email}`.toLowerCase().includes(filtro)
    );
  }

  async mostrarMensaje(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }
}
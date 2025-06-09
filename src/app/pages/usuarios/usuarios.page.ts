import { Component, OnInit } from '@angular/core';
import { IonicModule, AlertController, LoadingController, ToastController, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UsuariosService, Usuario, Role } from '../../services/usuarios.service';
import { firstValueFrom } from 'rxjs';
import { FormularioUsuarioComponent } from './formulario-usuario/formulario-usuario.component';

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

    this.usuariosService.obtenerUsuarios().subscribe({
      next: (respuesta: Usuario[]) => {
        console.log('Respuesta del backend para usuarios:', respuesta);
        this.usuarios = respuesta.sort((a, b) => {
          const nombreA = (a.name || '').toLowerCase();
          const nombreB = (b.name || '').toLowerCase();
          if (nombreA < nombreB) return -1;
          if (nombreA > nombreB) return 1;
          return 0;
        });
        this.usuariosFiltrados = this.usuarios;
        loading.dismiss();
      },
      error: async (error: any) => {
        console.error('Error al obtener usuarios:', error);
        await loading.dismiss();
        this.mostrarMensaje('Error al cargar usuarios.', 'danger');
      }
    });
  }

  async abrirFormulario(usuario?: Usuario) {
    const modal = await this.modalController.create({
      component: FormularioUsuarioComponent,
      componentProps: {
        usuario: usuario ?? null,
        editMode: !!usuario
      },
      showBackdrop: true,
      backdropDismiss: false,
      cssClass: 'usuario-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    console.log('Data recibida al cerrar el modal:', data);

    if (data?.usuario && !data.error) {
      this.cargarUsuarios();
      this.mostrarMensaje(usuario ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente', 'success');
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

    this.usuariosService.crearUsuario(usuario as any).subscribe({
      next: (response: Usuario) => {
        this.cargarUsuarios();
        this.mostrarMensaje('Usuario creado correctamente', 'success');
        loading.dismiss();
      },
      error: (error) => {
        console.error('Error al crear usuario:', error);
        const mensajeError = error.error?.message || 'Error al crear el usuario';
        this.mostrarMensaje(mensajeError, 'danger');
        loading.dismiss();
      }
    });
  }

  async actualizarUsuario(usuario: any) {
    console.log('Usuario recibido para actualizar:', usuario);
    if (!usuario.id) {
      this.mostrarMensaje('Error: No se puede actualizar un usuario sin ID', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Actualizando usuario...',
    });
    await loading.present();

    const usuarioSinId = { ...usuario };
    delete usuarioSinId.id;

    // Extrae el role_id antes de eliminarlo del objeto usuario
    const roleId = usuario.role_id;
    delete usuarioSinId.role_id;

    // Primero actualiza los datos básicos
    this.usuariosService.actualizarUsuario(usuario.id, usuarioSinId).subscribe({
      next: (response: Usuario) => {
        // Luego actualiza el rol si existe
        if (roleId) {
          this.usuariosService.actualizarRolesUsuario(usuario.id!, [roleId]).subscribe({
            next: () => {
              this.cargarUsuarios();
              this.mostrarMensaje('Usuario actualizado correctamente', 'success');
              loading.dismiss();
            },
            error: (error) => {
              console.error('Error al actualizar el rol:', error);
              this.mostrarMensaje('Error al actualizar el rol del usuario.', 'danger');
              loading.dismiss();
            }
          });
        } else {
          this.cargarUsuarios();
          this.mostrarMensaje('Usuario actualizado correctamente', 'success');
          loading.dismiss();
        }
      },
      error: (error) => {
        console.error('Error al actualizar usuario:', error);
        this.mostrarMensaje('Error al actualizar el usuario.', 'danger');
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

            this.usuariosService.eliminarUsuario(id).subscribe({
              next: () => {
                this.cargarUsuarios();
                this.mostrarMensaje('Usuario eliminado correctamente', 'success');
                loading.dismiss();
              },
              error: (error) => {
                console.error('Error al eliminar usuario:', error);
                this.cargarUsuarios();
                this.mostrarMensaje('Error al eliminar. Usuario eliminado localmente.', 'warning');
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

  onToggleEnabled(usuario: any) {
    const accion = usuario.enabled ? 'disable' : 'enable';
    this.usuariosService.toggleUsuarioEnabled(usuario.id, accion).subscribe({
      next: () => {
        usuario.enabled = !usuario.enabled;
        this.mostrarMensaje(
          `Usuario ${usuario.enabled ? 'habilitado' : 'deshabilitado'} correctamente`,
          'success'
        );
      },
      error: () => {
        this.mostrarMensaje('No se pudo cambiar el estado del usuario', 'danger');
      }
    });
  }
}
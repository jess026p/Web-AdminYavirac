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
  imports: [CommonModule, IonicModule, FormsModule, ReactiveFormsModule, FormularioUsuarioComponent],
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
        this.usuarios = respuesta;
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
    let roles: Role[] = [];

    try {
      const rolesData: any = await firstValueFrom(this.usuariosService.obtenerRoles());
      console.log("Roles obtenidos del servidor:", rolesData);
      roles = Array.isArray(rolesData) ? rolesData : rolesData?.data || [];
    } catch (error) {
      console.error('Error al cargar roles:', error);
      roles = [
        { id: '1', name: 'Administrador', code: 'admin' },
        { id: '2', name: 'Empleado', code: 'employee' }
      ];
      this.mostrarMensaje('No se pudieron cargar los roles del servidor', 'warning');
    }

    const modal = await this.modalController.create({
      component: FormularioUsuarioComponent,
      componentProps: {
        usuario: usuario ?? null,
        roles: roles,
        editMode: !!usuario
      },
      showBackdrop: true,
      backdropDismiss: false,
      cssClass: 'usuario-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data?.usuario) {
      const usuarioData = {
        ...data.usuario,
        roles: data.usuario.roles.map((r: any) => typeof r === 'object' ? r.id : r)
      };

      usuario ? this.actualizarUsuario(usuarioData) : this.crearUsuario(usuarioData);
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

  async actualizarUsuario(usuario: Usuario) {
    if (!usuario.id) {
      this.mostrarMensaje('Error: No se puede actualizar un usuario sin ID', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Actualizando usuario...',
    });
    await loading.present();

    this.usuariosService.actualizarUsuario(usuario as any).subscribe({
      next: (response: Usuario) => {
        this.cargarUsuarios();
        this.mostrarMensaje('Usuario actualizado correctamente', 'success');
        loading.dismiss();
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
}
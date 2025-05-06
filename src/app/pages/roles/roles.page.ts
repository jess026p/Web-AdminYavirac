import { Component, OnInit } from '@angular/core';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService, Usuario, Role } from '../../services/usuarios.service';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  providers: [ToastController],
  templateUrl: './roles.page.html',
  styleUrls: ['./roles.page.scss']
})
export class RolesPage implements OnInit {
  usuarios: Usuario[] = [];
  roles: Role[] = [];
  cargando = false;

  constructor(
    private usuariosService: UsuariosService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    this.cargarDatos();
  }

  async cargarDatos() {
    this.cargando = true;
    try {
      const usuarios = await this.usuariosService.obtenerUsuarios().toPromise();
      const roles = await this.usuariosService.obtenerRoles().toPromise();
      this.usuarios = usuarios ?? [];
      this.roles = roles ?? [];
    } catch (error) {
      this.mostrarMensaje('Error al cargar usuarios o roles', 'danger');
    }
    this.cargando = false;
  }

  rolesSeleccionados(usuario: Usuario): string[] {
    return usuario.roles ? usuario.roles.map(r => typeof r === 'object' ? r.id : r) : [];
  }

  onRolesChange(usuario: Usuario, nuevosRoles: string[]) {
    usuario.roles = this.roles.filter(r => nuevosRoles.includes(r.id));
  }

  async guardarRoles(usuario: Usuario) {
    if (!usuario.id) {
      this.mostrarMensaje('Error: No se puede actualizar un usuario sin ID', 'danger');
      return;
    }
    const loading = await this.loadingController.create({ message: 'Guardando roles...' });
    await loading.present();
    try {
      // Obtener solo los IDs de los roles
      const rolesIds = usuario.roles?.map(rol => rol.id) || [];
      
      console.log('Roles a actualizar:', rolesIds);
      
      await this.usuariosService.actualizarRolesUsuario(usuario.id, rolesIds).toPromise();
      this.mostrarMensaje('Roles actualizados correctamente', 'success');
    } catch (error) {
      console.error('Error al actualizar roles:', error);
      const errorMessage = (error as any)?.error?.message || 'Error desconocido';
      console.error('Mensaje de error completo:', errorMessage);
      this.mostrarMensaje('Error al actualizar roles: ' + errorMessage, 'danger');
    }
    loading.dismiss();
  }

  async mostrarMensaje(msg: string, color: string) {
    const toast = await this.toastController.create({
      message: msg,
      duration: 2500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}

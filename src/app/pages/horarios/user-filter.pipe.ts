import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'userFilter'
})
export class UserFilterPipe implements PipeTransform {
  transform(usuarios: any[], filtro: string): any[] {
    if (!usuarios) return [];
    if (!filtro) return usuarios;
    filtro = filtro.toLowerCase();
    return usuarios.filter(usuario =>
      usuario.name?.toLowerCase().includes(filtro) ||
      usuario.lastname?.toLowerCase().includes(filtro) ||
      usuario.email?.toLowerCase().includes(filtro)
    );
  }
} 
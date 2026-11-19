import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PaginaService } from '../../services/pagina.service';

@Component({
  selector: 'app-nav-horizontal',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './nav-horizontal.component.html',
  styleUrl: './nav-horizontal.component.css',
})
export class NavHorizontalComponent {
  private readonly paginaService = inject(PaginaService);

  menuAberto = false;

  links = [
    { rotulo: 'Música', pagina: 'musica' },
    // { rotulo: 'Literatura', pagina: 'literatura' },
    // { rotulo: 'Mídias', pagina: 'midias' },
    // { rotulo: 'Blog', pagina: 'blog' },
    // { rotulo: 'Lojas', pagina: 'lojas' },
  ];

  selecionar(pagina: string): void {
    this.paginaService.selecionar(pagina);
    this.menuAberto = false;
  }

  fecharMenu(): void {
    this.menuAberto = false;
  }
}
import { Component, inject } from '@angular/core';
import { PaginaService } from '../../services/pagina.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css',
})
export class InicioComponent {
  private readonly paginaService = inject(PaginaService);

  readonly secoes = [
    { pagina: 'musica', titulo: 'Música', descricao: 'Player de música.' },
    { pagina: 'literatura', titulo: 'Literatura', descricao: 'Algumas obras da literatura dark.' },
    { pagina: 'midias', titulo: 'Mídias', descricao: 'Filmes, vídeos e outras mídias' },
    { pagina: 'blog', titulo: 'Blog', descricao: 'Em obra.' },
    { pagina: 'lojas', titulo: 'Lojas', descricao: 'Em obra.' },
  ];

  abrirSecao(pagina: string): void {
    this.paginaService.selecionar(pagina);
  }
}

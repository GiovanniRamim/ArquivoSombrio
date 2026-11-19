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
    { pagina: 'literatura', titulo: 'Literatura', descricao: 'EM BREVE', disabled: true },
    { pagina: 'midias', titulo: 'Mídias', descricao: 'EM BREVE', disabled: true},
  ];

  abrirSecao(pagina: string): void {
    this.paginaService.selecionar(pagina);
  }
}

import { Component, inject } from '@angular/core';
import { TabelaComponent, AcaoLinha } from '../../components/tabela/tabela.component';
import { PlayerService } from '../../services/player.service';

@Component({
  selector: 'app-musica',
  standalone: true,
  imports: [TabelaComponent],
  templateUrl: './musica.component.html',
  styleUrl: './musica.component.css',
})
export class MusicaComponent {
  caminho = 'assets/musica.csv';
  musicPlayerService = inject(PlayerService);

  tocar = (musica: any) => {
    this.musicPlayerService.playLink(musica.Link, {
      titulo: musica.Obra ?? musica.Nome,
      artista: musica.Artista,
    });
  };

  adicionarNaPlaylist = (musica: Record<string, string>) => {
    this.musicPlayerService.adicionarNaFila(musica['Link'], {
      titulo: musica['Obra'] ?? musica['Nome'],
      artista: musica['Artista'],
    });
  };

  acoes: AcaoLinha[] = [
    { rotulo: 'Play', icone: '▶', executar: (linha) => this.tocar(linha) },
    { rotulo: 'Adicionar à fila', icone: '➕', executar: (linha) => this.adicionarNaPlaylist(linha) },
    { rotulo: 'Acessar no YouTube', icone: '↗', executar: (linha) => window.open(linha.Link, '_blank', 'noopener') },
  ];
}

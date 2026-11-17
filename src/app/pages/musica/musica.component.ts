import { Component, inject, Input } from '@angular/core';
import { TabelaComponent, AcaoLinha } from '../../components/tabela/tabela.component';
import { SubsectionsComponent, ItemSubsecao, AcaoSubsecao } from '../../components/subsections/subsections.component';
import { PlayerService } from '../../services/player.service';

@Component({
  selector: 'app-musica',
  standalone: true,
  imports: [TabelaComponent, SubsectionsComponent],
  templateUrl: './musica.component.html',
  styleUrl: './musica.component.css',
})
export class MusicaComponent {
  caminho = 'assets/musica.csv';
  musicPlayerService = inject(PlayerService);

  /** Itens da fila atual, refletidos na subseção. */
  get itensFila(): ItemSubsecao[] {
    const atual = this.musicPlayerService.index();
    return this.musicPlayerService.queue().map((m, i) => ({
      rotulo: m.titulo || m.link,
      ativo: i === atual,
    }));
  }

  /** Toca a música da fila escolhida na subseção. */
  tocarDaFila = (indice: number) => {
    this.musicPlayerService.playQueue(this.musicPlayerService.queue(), indice);
  };

  removerDaFila = (indice: number) => {
    this.musicPlayerService.removerDaFila(indice);
  };

  /** Move um item para cima ou para baixo, ignorando limites. */
  moverItem = (indice: number, para: number) => {
    this.musicPlayerService.moverNaFila(indice, para);
  };

  /** Ações do botão ▶ e ✖ em cada item da playlist. */
  acoesItemPlaylist: AcaoSubsecao[] = [
    { icone: '▶', rotulo: 'Tocar', executar: (i) => this.tocarDaFila(i) },
    { icone: '✖', rotulo: 'Remover da playlist', executar: (i) => this.removerDaFila(i) },
  ];

  /** Opções do menu ⋯ de cada item da playlist. */
  acoesMenuPlaylist: AcaoSubsecao[] = [
    { icone: '⤒', rotulo: 'Mover para o topo', executar: (i) => this.moverItem(i, 0) },
    { icone: '↑', rotulo: 'Mover para cima', executar: (i) => this.moverItem(i, i - 1) },
    { icone: '↓', rotulo: 'Mover para baixo', executar: (i) => this.moverItem(i, i + 1) },
    { icone: '⤓', rotulo: 'Mover para o fim', executar: (i) => this.moverItem(i, this.musicPlayerService.queue().length - 1) },
  ];

  /** Reordena ao soltar um item arrastado. */
  reordenarFila(evento: { de: number; para: number }) {
    this.moverItem(evento.de, evento.para);
  }

  tocar = (musica: any) => {
    this.musicPlayerService.playLink(musica.Link, {
      titulo: musica.Nome,
      artista: musica.Artista,
    });
  };

  adicionarNaPlaylist = (musica: any) => {
    this.musicPlayerService.adicionarNaFila(musica.Link, {
      titulo: musica.Nome,
      artista: musica.Artista,
    });
  };

  acoes: AcaoLinha[] = [
    { rotulo: 'Play', icone: '▶', executar: (linha) => this.tocar(linha) },
    { rotulo: 'Adicionar à fila', icone: '➕', executar: (linha) => this.adicionarNaPlaylist(linha) },
    { rotulo: 'Acessar no YouTube', icone: '↗', executar: (linha) => window.open(linha.Link, '_blank', 'noopener') },
  ];
}

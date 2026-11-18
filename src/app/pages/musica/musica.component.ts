import { Component, inject, Input, OnInit } from '@angular/core';
import { TabelaComponent, AcaoLinha } from '../../components/tabela/tabela.component';
import { SubsectionsComponent, ItemSubsecao, AcaoSubsecao } from '../../components/subsections/subsections.component';
import { DataService } from '../../services/data.service';
import { getVideoId, PlayerService } from '../../services/player.service';

@Component({
  selector: 'app-musica',
  standalone: true,
  imports: [TabelaComponent, SubsectionsComponent],
  templateUrl: './musica.component.html',
  styleUrl: './musica.component.css',
})
export class MusicaComponent implements OnInit {
  caminho = 'assets/musica.csv';
  musicPlayerService = inject(PlayerService);
  private dataService = inject(DataService);
  private catalogoMusical: Record<string, string>[] | null = null;
  private catalogoPromise: Promise<Record<string, string>[]> | null = null;
  private titulosPorVideo = new Map<string, string>();
  carregandoAleatorias = false;
  mensagemAleatorias = '';

  ngOnInit(): void {
    void this.carregarCatalogo().catch((error: unknown) => {
      console.error('Não foi possível carregar os nomes das músicas da playlist.', error);
      this.mensagemAleatorias = 'Não foi possível carregar os nomes das músicas.';
    });
  }

  /** Itens da fila atual, refletidos na subseção. */
  get itensFila(): ItemSubsecao[] {
    const atual = this.musicPlayerService.index();
    return this.musicPlayerService.queue().map((m, i) => ({
      rotulo: m.titulo || this.titulosPorVideo.get(getVideoId(m.link) ?? '') || m.link,
      ativo: i === atual,
    }));
  }

  private carregarCatalogo(): Promise<Record<string, string>[]> {
    if (this.catalogoMusical) return Promise.resolve(this.catalogoMusical);
    if (!this.catalogoPromise) {
      this.catalogoPromise = this.dataService.extrair(this.caminho)
        .then(({ linhas }) => {
          this.catalogoMusical = linhas;
          for (const musica of linhas) {
            const id = getVideoId(musica['Link'] ?? '');
            const titulo = (musica['Obra'] ?? musica['Nome'] ?? '').trim();
            if (id && titulo && !this.titulosPorVideo.has(id)) this.titulosPorVideo.set(id, titulo);
          }
          return linhas;
        })
        .catch((error: unknown) => {
          this.catalogoPromise = null;
          throw error;
        });
    }
    return this.catalogoPromise;
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
      titulo: musica.Obra ?? musica.Nome,
      artista: musica.Artista,
    });
  };

  adicionarNaPlaylist = (musica: any) => {
    this.musicPlayerService.adicionarNaFila(musica.Link, {
      titulo: musica.Obra ?? musica.Nome,
      artista: musica.Artista,
    });
  };

  adicionarCincoAleatorias = async (): Promise<void> => {
    if (this.carregandoAleatorias) return;
    this.carregandoAleatorias = true;
    this.mensagemAleatorias = '';

    try {
      const catalogo = await this.carregarCatalogo();

      const idsNaFila = new Set(
        this.musicPlayerService.queue()
          .map((musica) => getVideoId(musica.link))
          .filter((id): id is string => id !== undefined),
      );
      const idsDisponiveis = new Set(idsNaFila);
      const candidatas = catalogo.flatMap((musica) => {
        const link = (musica['Link'] ?? '').trim();
        const id = getVideoId(link);
        if (!id || idsDisponiveis.has(id)) return [];
        idsDisponiveis.add(id);

        return [{
          link,
          titulo: (musica['Obra'] ?? musica['Nome'] ?? '').trim(),
          artista: (musica['Artista'] ?? '').trim(),
        }];
      });

      for (let i = candidatas.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidatas[i], candidatas[j]] = [candidatas[j], candidatas[i]];
      }

      const sorteadas = candidatas.slice(0, 5);
      let adicionadas = 0;
      for (const musica of sorteadas) {
        if (this.musicPlayerService.adicionarNaFila(musica.link, musica)) adicionadas++;
      }

      this.mensagemAleatorias = adicionadas === 5
        ? '5 músicas aleatórias adicionadas.'
        : adicionadas > 0
          ? `Só havia ${adicionadas} músicas novas disponíveis.`
          : 'Não há músicas novas disponíveis para adicionar.';
    } catch (error) {
      console.error('Não foi possível carregar músicas aleatórias para a playlist.', error);
      this.mensagemAleatorias = 'Não foi possível carregar as músicas aleatórias.';
    } finally {
      this.carregandoAleatorias = false;
    }
  };

  acoes: AcaoLinha[] = [
    { rotulo: 'Play', icone: '▶', executar: (linha) => this.tocar(linha) },
    { rotulo: 'Adicionar à fila', icone: '➕', executar: (linha) => this.adicionarNaPlaylist(linha) },
    { rotulo: 'Acessar no YouTube', icone: '↗', executar: (linha) => window.open(linha.Link, '_blank', 'noopener') },
  ];
}

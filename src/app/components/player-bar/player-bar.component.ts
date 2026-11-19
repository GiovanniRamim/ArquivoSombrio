import { AfterViewInit, Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { SubsectionsComponent, ItemSubsecao, AcaoSubsecao } from '../subsections/subsections.component';
import { DataService } from '../../services/data.service';
import { getVideoId, PlayerService } from '../../services/player.service';
import { ModalDragService } from '../../services/modal-drag.service';

@Component({
  selector: 'app-player-bar',
  standalone: true,
  imports: [SubsectionsComponent],
  templateUrl: './player-bar.component.html',
  styleUrls: ['./player-bar.component.css']
})
export class PlayerBarComponent implements AfterViewInit {
  player = inject(PlayerService);
  private dataService = inject(DataService);
  private readonly arrasteModal = inject(ModalDragService);
  @ViewChild('videoModal') private videoModal?: ElementRef<HTMLElement>;
  @ViewChild('playlistModal') private playlistModal?: ElementRef<HTMLElement>;
  /** Controla se o slider de volume está visível. */
  volumeAberto = false;
  videoAberto = false;
  playlistAberta = false;
  modalLeft: number | null = null;
  modalTop: number | null = null;
  playlistModalLeft: number | null = null;
  playlistModalTop: number | null = null;
  carregandoAleatorias = false;
  mensagemAleatorias = '';

  private readonly caminhoCatalogo = 'assets/musica.csv';
  private catalogoMusical: Record<string, string>[] | null = null;
  private catalogoPromise: Promise<Record<string, string>[]> | null = null;
  private titulosPorVideo = new Map<string, string>();

  ngAfterViewInit() {
    this.player.init('yt-player');
  }

  fmt(s: number): string {
    const m = Math.floor(s / 60);
    const sec = String(Math.floor(s % 60)).padStart(2, '0');
    return `${m}:${sec}`;
  }

  get tituloVideo(): string {
    return this.player.current()?.titulo || 'Vídeo da música atual';
  }

  get itensFila(): ItemSubsecao[] {
    const atual = this.player.index();
    return this.player.queue().map((musica, indice) => ({
      rotulo: musica.titulo || this.titulosPorVideo.get(getVideoId(musica.link) ?? '') || musica.link,
      ativo: indice === atual,
    }));
  }

  abrirPlaylist(): void {
    this.playlistAberta = true;
    void this.carregarCatalogo().catch((error: unknown) => {
      console.error('Não foi possível carregar os nomes das músicas da playlist.', error);
      this.mensagemAleatorias = 'Não foi possível carregar os nomes das músicas.';
    });
  }

  fecharPlaylist(): void {
    this.playlistAberta = false;
    this.arrasteModal.parar('playlist');
    this.playlistModalLeft = null;
    this.playlistModalTop = null;
  }

  private carregarCatalogo(): Promise<Record<string, string>[]> {
    if (this.catalogoMusical) return Promise.resolve(this.catalogoMusical);
    if (!this.catalogoPromise) {
      this.catalogoPromise = this.dataService.extrair(this.caminhoCatalogo)
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

  tocarDaFila = (indice: number): void => {
    this.player.playQueue(this.player.queue(), indice);
  };

  removerDaFila = (indice: number): void => {
    this.player.removerDaFila(indice);
  };

  moverItem = (indice: number, para: number): void => {
    this.player.moverNaFila(indice, para);
  };

  acoesItemPlaylist: AcaoSubsecao[] = [
    { icone: '▶', rotulo: 'Tocar', executar: (indice) => this.tocarDaFila(indice) },
    { icone: '✖', rotulo: 'Remover da playlist', executar: (indice) => this.removerDaFila(indice) },
  ];

  acoesMenuPlaylist: AcaoSubsecao[] = [
    { icone: '⤒', rotulo: 'Mover para o topo', executar: (indice) => this.moverItem(indice, 0) },
    { icone: '↑', rotulo: 'Mover para cima', executar: (indice) => this.moverItem(indice, indice - 1) },
    { icone: '↓', rotulo: 'Mover para baixo', executar: (indice) => this.moverItem(indice, indice + 1) },
    { icone: '⤓', rotulo: 'Mover para o fim', executar: (indice) => this.moverItem(indice, this.player.queue().length - 1) },
  ];

  reordenarFila(evento: { de: number; para: number }): void {
    this.moverItem(evento.de, evento.para);
  }

  adicionarCincoAleatorias = async (): Promise<void> => {
    if (this.carregandoAleatorias) return;
    this.carregandoAleatorias = true;
    this.mensagemAleatorias = '';

    try {
      const catalogo = await this.carregarCatalogo();
      const idsDisponiveis = new Set(
        this.player.queue()
          .map((musica) => getVideoId(musica.link))
          .filter((id): id is string => id !== undefined),
      );
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

      let adicionadas = 0;
      for (const musica of candidatas.slice(0, 5)) {
        if (this.player.adicionarNaFila(musica.link, musica)) adicionadas++;
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

  abrirVideo(): void {
    this.videoAberto = true;
    this.atualizarTamanhoVideo();
  }

  fecharVideo(): void {
    this.videoAberto = false;
    this.arrasteModal.parar('video');
    this.modalLeft = null;
    this.modalTop = null;
  }

  iniciarArraste(event: PointerEvent): void {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest('button'))) return;
    const modal = this.videoModal?.nativeElement;
    if (!modal) return;

    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    const bounds = modal.getBoundingClientRect();
    this.modalLeft = bounds.left;
    this.modalTop = bounds.top;
    this.arrasteModal.iniciar({
      modal: 'video',
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
    });
    event.preventDefault();
  }

  iniciarArrastePlaylist(event: PointerEvent): void {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest('button'))) return;
    const modal = this.playlistModal?.nativeElement;
    if (!modal) return;

    const bounds = modal.getBoundingClientRect();
    this.playlistModalLeft = bounds.left;
    this.playlistModalTop = bounds.top;
    this.arrasteModal.iniciar({
      modal: 'playlist',
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
    });
    event.preventDefault();
  }

  @HostListener('document:pointermove', ['$event'])
  moverModal(event: PointerEvent): void {
    const arraste = this.arrasteModal.atual;
    if (!arraste) return;

    const modal = arraste.modal === 'video'
      ? this.videoModal?.nativeElement
      : this.playlistModal?.nativeElement;

    if (!modal) {
      this.arrasteModal.parar(arraste.modal);
      return;
    }

    const bounds = modal.getBoundingClientRect();
    const maxLeft = Math.max(0, window.innerWidth - bounds.width);
    const maxTop = Math.max(0, window.innerHeight - bounds.height);
    const left = Math.min(maxLeft, Math.max(0, event.clientX - arraste.offsetX));
    const top = Math.min(maxTop, Math.max(0, event.clientY - arraste.offsetY));

    if (arraste.modal === 'video') {
      this.modalLeft = left;
      this.modalTop = top;
    } else {
      this.playlistModalLeft = left;
      this.playlistModalTop = top;
    }
  }

  @HostListener('document:pointerup')
  pararArraste(): void {
    this.arrasteModal.parar();
  }

  @HostListener('window:resize')
  redimensionarModal(): void {
    if (this.videoAberto) {
      this.atualizarTamanhoVideo();
      this.moverModalParaDentroDaJanela();
    }
    if (this.playlistAberta) this.moverPlaylistModalParaDentroDaJanela();
  }

  private atualizarTamanhoVideo(): void {
    const width = Math.min(640, Math.max(200, window.innerWidth - 32));
    const height = Math.max(200, Math.round(width * 9 / 16));
    this.player.setVideoSize(width, height);
  }

  private moverModalParaDentroDaJanela(): void {
    if (this.modalLeft === null || this.modalTop === null) return;
    const bounds = this.videoModal?.nativeElement.getBoundingClientRect();
    if (!bounds) return;

    this.modalLeft = Math.min(Math.max(0, window.innerWidth - bounds.width), this.modalLeft);
    this.modalTop = Math.min(Math.max(0, window.innerHeight - bounds.height), this.modalTop);
  }

  private moverPlaylistModalParaDentroDaJanela(): void {
    if (this.playlistModalLeft === null || this.playlistModalTop === null) return;
    const bounds = this.playlistModal?.nativeElement.getBoundingClientRect();
    if (!bounds) return;

    this.playlistModalLeft = Math.min(Math.max(0, window.innerWidth - bounds.width), this.playlistModalLeft);
    this.playlistModalTop = Math.min(Math.max(0, window.innerHeight - bounds.height), this.playlistModalTop);
  }
}
import { Injectable, NgZone, computed, signal } from '@angular/core';

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void; }
}

export interface Musica { id: number | string; titulo: string; artista?: string; link: string; }

export const getVideoId = (url = ''): string | undefined =>
  url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1];

const CURRENT_PLAYLIST_CACHE_KEY = 'arquivo-sombrio.current-playlist';

interface CachedPlaylist {
  queue: Musica[];
  index: number;
}

function isMusica(value: unknown): value is Musica {
  if (typeof value !== 'object' || value === null) return false;
  const musica = value as Record<string, unknown>;

  return (
    (typeof musica['id'] === 'number' || typeof musica['id'] === 'string') &&
    typeof musica['titulo'] === 'string' &&
    (musica['artista'] === undefined || typeof musica['artista'] === 'string') &&
    typeof musica['link'] === 'string'
  );
}

function isCachedPlaylist(value: unknown): value is CachedPlaylist {
  if (typeof value !== 'object' || value === null) return false;
  const cached = value as Record<string, unknown>;

  return Array.isArray(cached['queue']) &&
    cached['queue'].every(isMusica) &&
    typeof cached['index'] === 'number';
}

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private yt: any;
  private ready = false;
  private pollId?: ReturnType<typeof setInterval>;
  private videoWidth = 640;
  private videoHeight = 360;

  readonly queue = signal<Musica[]>([]);
  readonly index = signal(-1);
  readonly playing = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly volume = signal(60);
  readonly current = computed(() => this.queue()[this.index()] ?? null);

  constructor(private zone: NgZone) {}

  /** Chamado uma vez pelo PlayerBar, com o id do elemento que hospeda o iframe */
  async init(elementId: string): Promise<void> {
    await this.loadApi();
    this.yt = new window.YT.Player(elementId, {
      width: this.videoWidth,
      height: this.videoHeight,
      playerVars: { playsinline: 1, rel: 0 },
      events: {
        onReady: () => this.zone.run(() => {
          this.ready = true;
          this.yt.setVolume(this.volume());
          this.yt.setSize(this.videoWidth, this.videoHeight);
          this.loadCurrent(); // caso já exista música selecionada
        }),
        onStateChange: (e: any) => this.zone.run(() => this.onState(e.data)),
        onError: () => this.zone.run(() => this.next()), // removido ou sem embed: pula
      },
    });
  }

  private loadApi(): Promise<void> {
    return new Promise((resolve) => {
      if (window.YT?.Player) return resolve();
      window.onYouTubeIframeAPIReady = () => resolve();
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    });
  }

  private onState(state: number) {
    const S = window.YT.PlayerState;
    this.playing.set(state === S.PLAYING);

    if (state === S.PLAYING) this.startPolling();
    else this.stopPolling();

    if (state === S.ENDED) this.next();
  }

  // o YouTube não emite evento de tempo, então faz polling
  private startPolling() {
    this.stopPolling();
    this.pollId = setInterval(() => {
      this.currentTime.set(this.yt.getCurrentTime());
      this.duration.set(this.yt.getDuration());
    }, 500);
  }

  private stopPolling() {
    if (this.pollId) clearInterval(this.pollId);
    this.pollId = undefined;
  }

  private loadCurrent() {
    const musica = this.current();
    const id = getVideoId(musica?.link);
    if (!musica || !id) {
      this.cachePlaylist();
      return;
    }

    this.cachePlaylist();
    if (this.ready && id) {
      this.currentTime.set(0);
      this.yt.loadVideoById(id);
    }
  }

  private cachePlaylist(): void {
    try {
      const cached: CachedPlaylist = {
        queue: this.queue(),
        index: this.index(),
      };
      window.localStorage.setItem(CURRENT_PLAYLIST_CACHE_KEY, JSON.stringify(cached));
    } catch (error) {
      console.error('Não foi possível salvar a playlist atual no cache.', error);
    }
  }

  // ---- API pública ----

  restoreCurrent(): void {
    let cached: string | null;
    try {
      cached = window.localStorage.getItem(CURRENT_PLAYLIST_CACHE_KEY);
    } catch (error) {
      console.error('Não foi possível acessar o cache da playlist atual.', error);
      return;
    }
    if (!cached) return;

    let playlist: unknown;
    try {
      playlist = JSON.parse(cached);
    } catch (error) {
      console.error('Não foi possível ler a playlist salva no cache.', error);
      return;
    }

    if (!isCachedPlaylist(playlist)) {
      console.warn('A playlist salva no cache possui um formato inválido.');
      return;
    }

    const queue: Musica[] = [];
    for (const musica of playlist.queue) {
      const videoId = getVideoId(musica.link);
      if (videoId) queue.push({ ...musica, id: videoId });
    }

    if (!queue.length) {
      console.warn('A playlist salva no cache não contém links válidos do YouTube.');
      return;
    }

    const index = playlist.index >= 0 && playlist.index < queue.length ? playlist.index : 0;
    this.queue.set(queue);
    this.index.set(index);
    this.loadCurrent();
  }

  preencherMetadados(catalogo: Record<string, string>[]): void {
    const metadadosPorVideo = new Map<string, { titulo: string; artista: string }>();
    for (const musica of catalogo) {
      const id = getVideoId(musica['Link'] ?? '');
      const titulo = (musica['Obra'] ?? musica['Nome'] ?? '').trim();
      const artista = (musica['Artista'] ?? '').trim();
      if (id && (titulo || artista) && !metadadosPorVideo.has(id)) {
        metadadosPorVideo.set(id, { titulo, artista });
      }
    }

    let alterou = false;
    const fila = this.queue().map((musica) => {
      const id = getVideoId(musica.link);
      const metadados = id ? metadadosPorVideo.get(id) : undefined;
      if (!metadados) return musica;

      const titulo = musica.titulo.trim() ? musica.titulo : metadados.titulo;
      const artista = musica.artista?.trim() ? musica.artista : metadados.artista;
      if (titulo === musica.titulo && artista === musica.artista) return musica;

      alterou = true;
      return { ...musica, titulo, artista };
    });

    if (alterou) {
      this.queue.set(fila);
      this.cachePlaylist();
    }
  }

  playQueue(list: Musica[], i: number) {
    this.queue.set(list);
    this.index.set(i);
    this.loadCurrent();
  }

  toggle() {
    this.playing() ? this.yt.pauseVideo() : this.yt.playVideo();
  }

  next() {
    const n = this.queue().length;
    if (n <= 1) return;
    this.index.update((i) => (i + 1) % n);
    this.loadCurrent();
  }

  prev() {
    const n = this.queue().length;
    if (this.currentTime() > 3 || n <= 1) return this.seek(0);
    this.index.update((i) => (i - 1 + n) % n);
    this.loadCurrent();
  }

  seek(seconds: number) {
    this.yt.seekTo(seconds, true);
    this.currentTime.set(seconds);
  }

  setVolume(v: number) {
    this.yt.setVolume(v);
    this.volume.set(v);
  }

  setVideoSize(width: number, height: number): void {
    this.videoWidth = width;
    this.videoHeight = height;
    if (this.ready) this.yt.setSize(width, height);
  }

    // 1. ID do vídeo atual, derivado do link (substitui o uso do id da lista)
  readonly currentVideoId = computed(() => getVideoId(this.current()?.link));

  // 2. Toca um link diretamente
  playLink(link: string, info: { titulo?: string; artista?: string } = {}): boolean {
    const videoId = getVideoId(link);
    if (!videoId) {
      console.warn('Link do YouTube inválido:', link);
      return false;
    }

    // clicou na música que já está carregada: alterna play/pause
    if (videoId === this.currentVideoId()) {
      this.cachePlaylist();
      this.toggle();
      return true;
    }

    // já está na fila: toca a partir dela, sem recriar a lista
    const existente = this.queue().findIndex((m) => getVideoId(m.link) === videoId);
    if (existente >= 0) {
      this.index.set(existente);
      this.loadCurrent();
      return true;
    }

    // não está na fila: adiciona ao fim e toca
    this.queue.update((q) => [
      ...q,
      { id: videoId, titulo: info.titulo ?? '', artista: info.artista ?? '', link },
    ]);
    this.index.set(this.queue().length - 1);
    this.loadCurrent();
    return true;
  }

  // Adiciona uma música ao fim da fila; começa a tocar se nada estiver carregado
  adicionarNaFila(link: string, info: { titulo?: string; artista?: string } = {}): boolean {
    const videoId = getVideoId(link);
    if (!videoId) {
      console.warn('Link do YouTube inválido:', link);
      return false;
    }

    // evita duplicar a mesma música na fila
    if (this.queue().some((m) => getVideoId(m.link) === videoId)) return true;

    this.queue.update((q) => [
      ...q,
      { id: videoId, titulo: info.titulo ?? '', artista: info.artista ?? '', link },
    ]);

    if (this.index() < 0) {
      this.index.set(0);
      this.loadCurrent();
    } else {
      this.cachePlaylist();
    }
    return true;
  }

  // Remove um item da fila, mantendo a música atual quando possível
  removerDaFila(indice: number) {
    const fila = this.queue();
    if (indice < 0 || indice >= fila.length) return;

    const atual = this.current();
    const nova = fila.filter((_, i) => i !== indice);
    this.queue.set(nova);

    if (!nova.length) {
      this.index.set(-1);
      this.cachePlaylist();
      return;
    }
    if (atual && nova.includes(atual)) {
      this.index.set(nova.indexOf(atual));
      this.cachePlaylist();
    } else {
      // a música atual foi removida: toca a que ficou na mesma posição
      this.index.set(Math.min(indice, nova.length - 1));
      this.loadCurrent();
    }
  }

  // Move um item da fila de uma posição para outra (reordenação)
  moverNaFila(de: number, para: number) {
    const fila = [...this.queue()];
    if (de === para || de < 0 || para < 0 || de >= fila.length || para >= fila.length) return;

    const atual = this.current();
    const [item] = fila.splice(de, 1);
    fila.splice(para, 0, item);
    this.queue.set(fila);
    if (atual) {
      this.index.set(fila.indexOf(atual));
      this.cachePlaylist();
    }
  }

  // 3. Verifica se um link é o que está tocando (para o destaque)
  isCurrent(link: string): boolean {
    return getVideoId(link) === this.currentVideoId();
  }
}
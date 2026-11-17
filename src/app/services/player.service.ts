import { Injectable, NgZone, computed, signal } from '@angular/core';

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void; }
}

export interface Musica { id: number | string; titulo: string; artista?: string; link: string; }

export const getVideoId = (url = ''): string | undefined =>
  url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1];

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private yt: any;
  private ready = false;
  private pollId?: ReturnType<typeof setInterval>;

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
      width: 1,
      height: 1,
      playerVars: { playsinline: 1, rel: 0 },
      events: {
        onReady: () => this.zone.run(() => {
          this.ready = true;
          this.yt.setVolume(this.volume());
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
    const id = getVideoId(this.current()?.link);
    if (this.ready && id) {
      this.currentTime.set(0);
      this.yt.loadVideoById(id);
    }
  }

  // ---- API pública ----

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
      return;
    }
    if (atual && nova.includes(atual)) {
      this.index.set(nova.indexOf(atual));
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
    if (atual) this.index.set(fila.indexOf(atual));
  }

  // 3. Verifica se um link é o que está tocando (para o destaque)
  isCurrent(link: string): boolean {
    return getVideoId(link) === this.currentVideoId();
  }
}
import { AfterViewInit, Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { PlayerService } from '../../services/player.service';

@Component({
  selector: 'app-player-bar',
  standalone: true,
  templateUrl: './player-bar.component.html',
  styleUrls: ['./player-bar.component.css']
})
export class PlayerBarComponent implements AfterViewInit {
  player = inject(PlayerService);
  @ViewChild('videoModal') private videoModal?: ElementRef<HTMLElement>;
  /** Controla se o slider de volume está visível. */
  volumeAberto = false;
  videoAberto = false;
  modalLeft: number | null = null;
  modalTop: number | null = null;

  private arrastando = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

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

  abrirVideo(): void {
    this.videoAberto = true;
    this.atualizarTamanhoVideo();
  }

  fecharVideo(): void {
    this.videoAberto = false;
    this.arrastando = false;
    this.modalLeft = null;
    this.modalTop = null;
  }

  iniciarArraste(event: PointerEvent): void {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest('button'))) return;
    const modal = this.videoModal?.nativeElement;
    if (!modal) return;

    const bounds = modal.getBoundingClientRect();
    this.modalLeft = bounds.left;
    this.modalTop = bounds.top;
    this.dragOffsetX = event.clientX - bounds.left;
    this.dragOffsetY = event.clientY - bounds.top;
    this.arrastando = true;
    event.preventDefault();
  }

  @HostListener('document:pointermove', ['$event'])
  moverModal(event: PointerEvent): void {
    if (!this.arrastando) return;

    const bounds = this.videoModal?.nativeElement.getBoundingClientRect();
    if (!bounds) return;

    this.modalLeft = Math.min(
      window.innerWidth - bounds.width,
      Math.max(0, event.clientX - this.dragOffsetX),
    );
    this.modalTop = Math.min(
      window.innerHeight - bounds.height,
      Math.max(0, event.clientY - this.dragOffsetY),
    );
  }

  @HostListener('document:pointerup')
  pararArraste(): void {
    this.arrastando = false;
  }

  @HostListener('window:resize')
  redimensionarModal(): void {
    if (!this.videoAberto) return;
    this.atualizarTamanhoVideo();
    this.moverModalParaDentroDaJanela();
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
}
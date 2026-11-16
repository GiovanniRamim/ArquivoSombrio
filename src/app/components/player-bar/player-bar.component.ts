import { AfterViewInit, Component, inject } from '@angular/core';
import { PlayerService } from '../../services/player.service';

@Component({
  selector: 'app-player-bar',
  standalone: true,
  templateUrl: './player-bar.component.html',
  styleUrls: ['./player-bar.component.css']
})
export class PlayerBarComponent implements AfterViewInit {
  player = inject(PlayerService);
  /** Controla se o slider de volume está visível. */
  volumeAberto = false;

  ngAfterViewInit() {
    this.player.init('yt-player');
  }

  fmt(s: number): string {
    const m = Math.floor(s / 60);
    const sec = String(Math.floor(s % 60)).padStart(2, '0');
    return `${m}:${sec}`;
  }
}
import { Component, Input, inject } from '@angular/core';
import { Musica, PlayerService } from '../../services/player.service';

@Component({
  selector: 'app-musicas',
  standalone: true,
  template: `
    <ul>
      @for (m of musicas; track m.id; let i = $index) {
        <li
          class="musica"
          [class.ativa]="m.id === player.current()?.id"
          (click)="player.playQueue(musicas, i)"
        >
          {{ m.titulo }}
        </li>
      }
    </ul>
  `,
  styles: [`
    .musica { cursor: pointer; }
    .musica.ativa { color: #1db954; font-weight: 600; }
  `],
})
export class MusicasComponent {
  @Input({ required: true }) musicas: Musica[] = [];
  player = inject(PlayerService);
}
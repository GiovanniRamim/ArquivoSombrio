import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavHorizontalComponent } from './components/nav-horizontal/nav-horizontal.component';
import { SubsectionsComponent } from './components/subsections/subsections.component';
import { PlayerBarComponent } from './components/player-bar/player-bar.component';
import { DataService } from './services/data.service';
import { PlayerService } from './services/player.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavHorizontalComponent, SubsectionsComponent, PlayerBarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  constructor(player: PlayerService, data: DataService) {
    player.restoreCurrent();
    if (!player.queue().some((musica) => !musica.titulo.trim() || !musica.artista?.trim())) return;

    void data.extrair('assets/musica.csv')
      .then(({ linhas }) => player.preencherMetadados(linhas))
      .catch((error: unknown) => {
        console.error('Não foi possível carregar os metadados da playlist.', error);
      });
  }
}

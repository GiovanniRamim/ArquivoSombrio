import { TestBed } from '@angular/core/testing';
import { PlayerService } from '../../services/player.service';
import { MusicaComponent } from './musica.component';

describe('MusicaComponent', () => {
  const cacheKey = 'biblioteca-das-sombras.current-playlist';
  let player: PlayerService;
  let component: MusicaComponent;

  beforeEach(() => {
    window.localStorage.removeItem(cacheKey);
    TestBed.configureTestingModule({
      providers: [PlayerService],
    });
    player = TestBed.inject(PlayerService);
    component = TestBed.runInInjectionContext(() => new MusicaComponent());
  });

  afterEach(() => {
    window.localStorage.removeItem(cacheKey);
  });

  it('adds a song to the player queue with its metadata', () => {
    component.adicionarNaPlaylist({
      Link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      Obra: 'Música A',
      Artista: 'Artista A',
    });

    expect(player.queue()).toEqual([{
      id: 'dQw4w9WgXcQ',
      link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      titulo: 'Música A',
      artista: 'Artista A',
    }]);
  });
});

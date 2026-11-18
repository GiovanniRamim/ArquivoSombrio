import { TestBed } from '@angular/core/testing';
import { PlayerService } from './player.service';

describe('PlayerService', () => {
  const cacheKey = 'biblioteca-das-sombras.current-playlist';
  let player: PlayerService;

  beforeEach(() => {
    window.localStorage.removeItem(cacheKey);
    TestBed.configureTestingModule({ providers: [PlayerService] });
    player = TestBed.inject(PlayerService);
  });

  afterEach(() => {
    window.localStorage.removeItem(cacheKey);
  });

  it('caches the playlist selected by playLink', () => {
    const link = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    expect(player.playLink(link, { titulo: 'Never Gonna Give You Up', artista: 'Rick Astley' })).toBeTrue();
    expect(JSON.parse(window.localStorage.getItem(cacheKey)!)).toEqual({
      queue: [{
        id: 'dQw4w9WgXcQ',
        titulo: 'Never Gonna Give You Up',
        artista: 'Rick Astley',
        link,
      }],
      index: 0,
    });
  });

  it('restores the cached playlist and current track', () => {
    const first = {
      id: 'dQw4w9WgXcQ',
      titulo: 'Never Gonna Give You Up',
      artista: 'Rick Astley',
      link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    };
    const second = {
      id: '9bZkp7q19f0',
      titulo: 'Gangnam Style',
      artista: 'PSY',
      link: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
    };
    window.localStorage.setItem(cacheKey, JSON.stringify({
      queue: [first, second],
      index: 1,
    }));

    player.restoreCurrent();

    expect(player.queue()).toEqual([first, second]);
    expect(player.current()).toEqual(second);
  });

  it('fills missing metadata on playlist tracks from the music catalog', () => {
    const link = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    player.adicionarNaFila(link);

    player.preencherMetadados([{
      Artista: 'Rick Astley',
      Obra: 'Never Gonna Give You Up',
      Link: link,
    }]);

    expect(player.current()).toEqual({
      id: 'dQw4w9WgXcQ',
      titulo: 'Never Gonna Give You Up',
      artista: 'Rick Astley',
      link,
    });
  });
});

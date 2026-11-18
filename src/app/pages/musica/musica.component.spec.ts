import { TestBed } from '@angular/core/testing';
import { DataService } from '../../services/data.service';
import { getVideoId, PlayerService } from '../../services/player.service';
import { MusicaComponent } from './musica.component';

describe('MusicaComponent', () => {
  const cacheKey = 'biblioteca-das-sombras.current-playlist';
  let dataService: jasmine.SpyObj<DataService>;
  let player: PlayerService;
  let component: MusicaComponent;

  beforeEach(() => {
    window.localStorage.removeItem(cacheKey);
    dataService = jasmine.createSpyObj<DataService>('DataService', ['extrair']);
    TestBed.configureTestingModule({
      providers: [
        PlayerService,
        { provide: DataService, useValue: dataService },
      ],
    });
    player = TestBed.inject(PlayerService);
    component = TestBed.runInInjectionContext(() => new MusicaComponent());
  });

  afterEach(() => {
    window.localStorage.removeItem(cacheKey);
  });

  it('adds five random songs that are not already in the playlist', async () => {
    const ids = [
      'dQw4w9WgXcQ',
      '9bZkp7q19f0',
      '3JZ_D3ELwOQ',
      'kJQP7kiw5Fk',
      'L_jWHffIx5E',
      '2Vv-BfVoq4g',
    ];
    dataService.extrair.and.resolveTo({
      colunas: ['Artista', 'Obra', 'Link'],
      linhas: ids.map((id, index) => ({
        Obra: `Obra ${index}`,
        Artista: `Artista ${index}`,
        Link: `https://www.youtube.com/watch?v=${id}`,
      })),
    });
    player.adicionarNaFila(`https://www.youtube.com/watch?v=${ids[0]}`);

    await component.adicionarCincoAleatorias();

    expect(player.queue().length).toBe(6);
    expect(new Set(player.queue().map((musica) => getVideoId(musica.link))).size).toBe(6);
    expect(player.queue().slice(1).every((musica) => musica.titulo.startsWith('Obra '))).toBeTrue();
    expect(component.itensFila[0].rotulo).toBe('Obra 0');
  });

  it('reports when fewer than five new songs are available', async () => {
    dataService.extrair.and.resolveTo({
      colunas: ['Artista', 'Obra', 'Link'],
      linhas: [
        { Obra: 'Música A', Artista: 'Artista A', Link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        { Obra: 'Música B', Artista: 'Artista B', Link: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
      ],
    });

    await component.adicionarCincoAleatorias();

    expect(player.queue().length).toBe(2);
    expect(component.mensagemAleatorias).toBe('Só havia 2 músicas novas disponíveis.');
  });
});

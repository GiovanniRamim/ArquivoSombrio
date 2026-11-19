import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataService } from '../../services/data.service';
import { getVideoId, PlayerService } from '../../services/player.service';
import { PlayerBarComponent } from './player-bar.component';

describe('PlayerBarComponent', () => {
  let component: PlayerBarComponent;
  let fixture: ComponentFixture<PlayerBarComponent>;
  let dataService: jasmine.SpyObj<DataService>;
  let player: PlayerService;

  beforeEach(async () => {
    dataService = jasmine.createSpyObj<DataService>('DataService', ['extrair']);
    dataService.extrair.and.resolveTo({ colunas: [], linhas: [] });
    await TestBed.configureTestingModule({
      imports: [PlayerBarComponent],
      providers: [
        PlayerService,
        { provide: DataService, useValue: dataService },
      ],
    })
    .compileComponents();

    player = TestBed.inject(PlayerService);
    spyOn(player, 'init').and.resolveTo();
    fixture = TestBed.createComponent(PlayerBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    window.localStorage.removeItem('arquivo-sombrio.current-playlist');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens and closes the playlist modal from the player', () => {
    const openButton = fixture.nativeElement.querySelector('.playlist-toggle') as HTMLButtonElement;
    openButton.click();
    fixture.detectChanges();

    expect(component.playlistAberta).toBeTrue();
    expect(fixture.nativeElement.querySelector('#playlist-modal app-subsections')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#playlist-modal .item-playlist')).toBeNull();
    expect(fixture.nativeElement.querySelector('.playlist-modal-header')).not.toBeNull();

    (fixture.nativeElement.querySelector('.playlist-close') as HTMLButtonElement).click();
    expect(component.playlistAberta).toBeFalse();
  });

  it('drags the playlist modal by its header and keeps it within the viewport', () => {
    component.abrirPlaylist();
    fixture.detectChanges();
    const modal = fixture.nativeElement.querySelector('#playlist-modal') as HTMLElement;
    spyOn(modal, 'getBoundingClientRect').and.returnValue(new DOMRect(20, 30, 200, 150));

    component.iniciarArrastePlaylist(new PointerEvent('pointerdown', {
      button: 0,
      clientX: 35,
      clientY: 45,
    }));
    component.moverPlaylistModal(new PointerEvent('pointermove', {
      clientX: 80,
      clientY: 90,
    }));

    expect(component.playlistModalLeft).toBe(65);
    expect(component.playlistModalTop).toBe(75);

    component.moverPlaylistModal(new PointerEvent('pointermove', {
      clientX: window.innerWidth + 200,
      clientY: window.innerHeight + 200,
    }));
    expect(component.playlistModalLeft).toBe(window.innerWidth - 200);
    expect(component.playlistModalTop).toBe(window.innerHeight - 150);
  });

  it('adds up to five random songs not already in the playlist', async () => {
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

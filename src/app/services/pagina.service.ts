import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PlayerService } from './player.service';

@Injectable({ providedIn: 'root' })
export class PaginaService {
  private readonly paginaSubject = new BehaviorSubject<string>('inicio');
  private readonly player = inject(PlayerService);

  /** Página atualmente selecionada, emitida sempre que muda. */
  readonly pagina$: Observable<string> = this.paginaSubject.asObservable();

  selecionar(pagina: string): void {
    this.paginaSubject.next(pagina);
  }

  tocar(musica: any) {
    this.player.playLink(musica.Link);
  }
}

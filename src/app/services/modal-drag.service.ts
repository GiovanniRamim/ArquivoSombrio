import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ModalEmArraste = 'video' | 'playlist';

export interface EstadoArrasteModal {
  modal: ModalEmArraste;
  offsetX: number;
  offsetY: number;
}

@Injectable({ providedIn: 'root' })
export class ModalDragService {
  private readonly estadoSubject =
    new BehaviorSubject<EstadoArrasteModal | null>(null);

  readonly estado$ = this.estadoSubject.asObservable();

  get atual(): EstadoArrasteModal | null {
    return this.estadoSubject.value;
  }

  iniciar(estado: EstadoArrasteModal): void {
    this.estadoSubject.next(estado);
  }

  parar(modal?: ModalEmArraste): void {
    const atual = this.estadoSubject.value;
    if (modal && atual?.modal !== modal) return;

    this.estadoSubject.next(null);
  }
}
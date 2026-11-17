import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface ItemSubsecao {
  rotulo: string;
  rota?: string;
  ativo?: boolean;
}

/** Ação exibida ao lado de cada item (modo lista/playlist). */
export interface AcaoSubsecao {
  icone: string;
  rotulo: string;
  executar: (indice: number) => void;
}

@Component({
  selector: 'app-subsections',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './subsections.component.html',
  styleUrl: './subsections.component.css',
})
export class SubsectionsComponent {
  @Input() titulo = 'Subseções';

  /** Itens exibidos. Com `rota`, navega; sem ela, usa `acao`. */
  @Input() links: ItemSubsecao[] = [];

  /** Chamado ao clicar em um item sem rota, recebendo o índice. */
  @Input() acao: ((indice: number) => void) | null = null;

  /** Ativa o modo playlist: botões por item, menu e arrastar para reordenar. */
  @Input() modoPlaylist = false;
  @Input() acoesItem: AcaoSubsecao[] = [];
  @Input() acoesMenu: AcaoSubsecao[] = [];

  /** Emite { de, para } quando um item é arrastado para outra posição. */
  @Output() reordenar = new EventEmitter<{ de: number; para: number }>();

  /** Índice cujo menu de reticências está aberto. */
  menuAberto: number | null = null;

  /** Índice do item sendo arrastado. */
  arrastando: number | null = null;

  alternarMenu(indice: number): void {
    this.menuAberto = this.menuAberto === indice ? null : indice;
  }

  executarMenu(acao: AcaoSubsecao, indice: number): void {
    this.menuAberto = null;
    acao.executar(indice);
  }

  iniciarArraste(indice: number, evento: DragEvent): void {
    this.arrastando = indice;
    evento.dataTransfer?.setData('text/plain', String(indice));
    if (evento.dataTransfer) evento.dataTransfer.effectAllowed = 'move';
  }

  permitirSoltar(evento: DragEvent): void {
    evento.preventDefault();
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'move';
  }

  soltar(indice: number, evento: DragEvent): void {
    evento.preventDefault();
    if (this.arrastando !== null && this.arrastando !== indice) {
      this.reordenar.emit({ de: this.arrastando, para: indice });
    }
    this.finalizarArraste();
  }

  finalizarArraste(): void {
    this.arrastando = null;
  }

  /** Fecha o menu ao clicar fora dele. */
  @HostListener('document:click', ['$event'])
  fecharMenu(evento: Event): void {
    const alvo = evento.target as HTMLElement;
    if (!alvo.closest('.menu-item')) this.menuAberto = null;
  }
}


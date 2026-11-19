import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PaginaService } from '../../services/pagina.service';
import { NavHorizontalComponent } from './nav-horizontal.component';

describe('NavHorizontalComponent', () => {
  let fixture: ComponentFixture<NavHorizontalComponent>;
  let selecionar: jasmine.Spy;

  beforeEach(async () => {
    selecionar = jasmine.createSpy('selecionar');
    await TestBed.configureTestingModule({
      imports: [NavHorizontalComponent],
      providers: [
        provideRouter([]),
        { provide: PaginaService, useValue: { selecionar } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavHorizontalComponent);
    fixture.detectChanges();
  });

  it('opens the floating navigation when its button is pressed', () => {
    const button = fixture.nativeElement.querySelector('.botao-menu') as HTMLButtonElement;

    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('#links-navegacao')).not.toBeNull();
  });

  it('selects a link and closes the navigation', () => {
    fixture.componentInstance.menuAberto = true;
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.painel-menu li a') as HTMLAnchorElement).click();
    fixture.detectChanges();

    expect(selecionar).toHaveBeenCalledOnceWith('musica');
    expect(fixture.nativeElement.querySelector('#links-navegacao')).toBeNull();
  });
});

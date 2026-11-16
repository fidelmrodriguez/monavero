import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CardService, DemoCard } from '../../core/services/card.service';
import { NotificationStore } from '../../core/state/notification.store';
import { CardsPage } from './cards.page';

const card: DemoCard = {
  id: 'card-1', label: 'Viagem', lastFour: '1234', status: 'ACTIVE',
  createdAt: '2026-11-16T10:00:00Z', updatedAt: '2026-11-16T10:00:00Z'
};

describe('CardsPage', () => {
  let fixture: ComponentFixture<CardsPage>;
  let cards: jasmine.SpyObj<CardService>;
  beforeEach(async () => {
    cards = jasmine.createSpyObj<CardService>('CardService', ['list', 'create', 'change']);
    cards.list.and.returnValue(of([card]));
    cards.create.and.returnValue(of(card));
    cards.change.and.returnValue(of({ ...card, status: 'BLOCKED' }));
    await TestBed.configureTestingModule({ imports: [CardsPage], providers: [
      { provide: CardService, useValue: cards },
      { provide: NotificationStore, useValue: { refresh: jasmine.createSpy('refresh'), add: jasmine.createSpy('add') } }
    ] }).compileComponents();
    fixture = TestBed.createComponent(CardsPage);
    fixture.detectChanges();
  });

  it('exibe somente quatro dígitos fictícios e não solicita dados de cartão real', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('••••');
    expect(text).toContain('1234');
    expect(text).toContain('SEM VALOR FINANCEIRO');
    expect(text).not.toContain('CVV');
  });

  it('executa o bloqueio na API antes de refletir o estado na tela', () => {
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find(item => item.textContent?.includes('Bloquear')) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    expect(cards.change).toHaveBeenCalledWith('card-1', 'block');
    expect(fixture.nativeElement.textContent).toContain('Bloqueado');
  });
});

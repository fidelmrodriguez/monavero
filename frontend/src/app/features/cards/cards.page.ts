import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { CardService, DemoCard, DemoCardStatus } from '../../core/services/card.service';
import { NotificationStore } from '../../core/state/notification.store';

@Component({
  selector: 'app-cards-page',
  imports: [DatePipe, FormsModule],
  templateUrl: './cards.page.html',
  styleUrl: './cards.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardsPage {
  private readonly cardsApi = inject(CardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notices = inject(NotificationStore);
  protected readonly cards = signal<DemoCard[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly cardLabel = signal('Meu cartão virtual');
  protected readonly confirmCancelId = signal<string | null>(null);

  constructor() { this.reload(); }

  protected reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.cardsApi.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: cards => { this.cards.set(cards); this.loading.set(false); },
      error: () => { this.error.set('Não foi possível consultar os cartões.'); this.loading.set(false); }
    });
  }

  protected activeCount(): number { return this.cards().filter(card => card.status !== 'CANCELED').length; }

  protected create(): void {
    const label = this.cardLabel().trim();
    if (this.busy() || label.length < 2 || label.length > 40 || this.activeCount() >= 3) return;
    this.busy.set(true);
    this.error.set('');
    this.cardsApi.create(label).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: card => {
        this.cards.update(items => [card, ...items]);
        this.busy.set(false);
        this.cardLabel.set('Meu cartão virtual');
        this.notices.refresh();
        this.notices.add({ title: 'Cartão criado', message: 'Seu cartão fictício está disponível.', type: 'success' });
      },
      error: err => {
        this.error.set(err.status === 409 ? 'Limite de três cartões ativos ou bloqueados.' : 'Não foi possível criar o cartão.');
        this.busy.set(false);
      }
    });
  }

  protected change(card: DemoCard, action: 'block' | 'unblock' | 'cancel'): void {
    if (this.busy()) return;
    if (action === 'cancel' && this.confirmCancelId() !== card.id) {
      this.confirmCancelId.set(card.id);
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.cardsApi.change(card.id, action).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: updated => {
        this.cards.update(items => items.map(item => item.id === updated.id ? updated : item));
        this.confirmCancelId.set(null);
        this.busy.set(false);
        this.notices.refresh();
      },
      error: () => {
        this.error.set('Não foi possível atualizar este cartão. Atualize a lista e tente novamente.');
        this.busy.set(false);
      }
    });
  }

  protected statusLabel(status: DemoCardStatus): string {
    return status === 'ACTIVE' ? 'Ativo (simulação)' : status === 'BLOCKED' ? 'Bloqueado' : 'Cancelado';
  }
}

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NotificationStore } from './notification.store';

// Verifica que o feed é remoto, que o titular anterior nunca vaza e que o estado de leitura persiste.
describe('NotificationStore Etapa 10', () => {
  let store: NotificationStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(NotificationStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('recupera notificações da API e marca como lidas somente após confirmação', () => {
    store.sync('usuario-1');
    http.expectOne(req => req.url.endsWith('/api/v1/notifications')).flush([
      { id: 'not-1', date: '2026-11-15T10:00:00Z', title: 'Transferência concluída',
        description: 'Confirmada', read: false, type: 'success' }
    ]);
    expect(store.unreadCount()).toBe(1);
    store.markAsRead('not-1');
    expect(store.unreadCount()).toBe(1);
    http.expectOne(req => req.url.endsWith('/api/v1/notifications/not-1/read') && req.method === 'PATCH')
      .flush(null);
    expect(store.unreadCount()).toBe(0);
  });

  it('descarta resposta atrasada de usuário anterior', () => {
    store.sync('usuario-1');
    const first = http.expectOne(req => req.url.endsWith('/api/v1/notifications'));
    store.sync('usuario-2');
    expect(store.notifications()).toEqual([]);
    const second = http.expectOne(req => req.url.endsWith('/api/v1/notifications'));
    second.flush([{ id: 'not-2', date: '', title: 'Outro titular', description: '', read: true, type: 'info' }]);
    first.flush([{ id: 'not-1', date: '', title: 'Não pode vazar', description: '', read: false, type: 'danger' }]);
    expect(store.notifications().map(item => item.id)).toEqual(['not-2']);
  });
});

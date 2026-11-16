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

  it('ao abrir o sino, remove o contador imediatamente sem excluir o histórico', () => {
    store.sync('usuario-1');
    http.expectOne(req => req.url.endsWith('/api/v1/notifications')).flush([
      { id: 'not-1', date: '', title: 'Transferência', description: '', read: false, type: 'success' },
      { id: 'not-2', date: '', title: 'Pagamento', description: '', read: true, type: 'info' }
    ]);
    expect(store.unreadCount()).toBe(1);

    store.acknowledgeOnOpen();
    expect(store.unreadCount()).toBe(0);
    expect(store.notifications().length).toBe(2);
    expect(store.notifications().every(item => item.read)).toBeTrue();

    const request = http.expectOne(req => req.url.endsWith('/api/v1/notifications/read-all'));
    expect(request.request.method).toBe('PATCH');
    request.flush(null);
    http.expectOne(req => req.url.endsWith('/api/v1/notifications')).flush([
      { id: 'not-1', date: '', title: 'Transferência', description: '', read: true, type: 'success' },
      { id: 'not-2', date: '', title: 'Pagamento', description: '', read: true, type: 'info' }
    ]);
    expect(store.unreadCount()).toBe(0);
    expect(store.notifications().length).toBe(2);
  });

  it('não deixa uma consulta anterior reacender a bolinha enquanto abre o sino', () => {
    store.sync('usuario-1');
    const oldRequest = http.expectOne(req => req.url.endsWith('/api/v1/notifications'));
    store.acknowledgeOnOpen();
    const update = http.expectOne(req => req.url.endsWith('/api/v1/notifications/read-all'));
    oldRequest.flush([
      { id: 'not-1', date: '', title: 'Antiga', description: '', read: false, type: 'warning' }
    ]);
    expect(store.unreadCount()).toBe(0);
    update.flush(null);
    http.expectOne(req => req.url.endsWith('/api/v1/notifications')).flush([
      { id: 'not-1', date: '', title: 'Antiga', description: '', read: true, type: 'warning' }
    ]);
    expect(store.unreadCount()).toBe(0);
  });

  it('restaura a sinalização de não lidas caso a API recuse a leitura', () => {
    store.sync('usuario-1');
    http.expectOne(req => req.url.endsWith('/api/v1/notifications')).flush([
      { id: 'not-1', date: '', title: 'Aviso', description: '', read: false, type: 'info' }
    ]);
    store.acknowledgeOnOpen();
    expect(store.unreadCount()).toBe(0);
    http.expectOne(req => req.url.endsWith('/api/v1/notifications/read-all'))
      .flush({ message: 'Falha' }, { status: 503, statusText: 'Service Unavailable' });
    http.expectOne(req => req.url.endsWith('/api/v1/notifications')).flush([
      { id: 'not-1', date: '', title: 'Aviso', description: '', read: false, type: 'info' }
    ]);
    expect(store.unreadCount()).toBe(1);
    expect(store.toasts().some(item => item.type === 'warning')).toBeTrue();
  });
});

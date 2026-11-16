import { registerLocaleData } from '@angular/common';
import pt from '@angular/common/locales/pt';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdminPage } from './admin.page';
import { AdminService, AdminUser } from '../../core/services/admin.service';
import { AuthStore } from '../../core/state/auth.store';

registerLocaleData(pt);

describe('AdminPage', () => {
  let fixture: ComponentFixture<AdminPage>;
  const users: AdminUser[] = [
    { id: 'one', name: 'Sem vínculo', email: 'one@example.test', role: 'CLIENT',
      status: 'ACTIVE', demo: false, version: 0, accounts: [] },
    { id: 'two', name: 'Duas contas', email: 'two@example.test', role: 'CLIENT',
      status: 'ACTIVE', demo: false, version: 0, accounts: [
        { id: 'a', number: 'MV001', branch: '0001', owner: 'Duas contas', status: 'ACTIVE', balance: 0 },
        { id: 'b', number: 'MV002', branch: '0001', owner: 'Duas contas', status: 'ACTIVE', balance: 12 }
      ] }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPage],
      providers: [
        { provide: AdminService, useValue: { users: () => of(users), update: () => of({ ...users[0], status: 'BLOCKED', version: 1 }) } },
        { provide: AuthStore, useValue: { session: () => ({ user: { id: 'guest' } }) } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(AdminPage);
    fixture.detectChanges();
  });

  it('reúne todos os usuários e vínculos em uma tabela, sem inventar conta ou saldo', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('table').length).toBe(1);
    expect(element.querySelectorAll('tbody tr').length).toBe(2);
    expect(element.textContent).toContain('Sem conta vinculada');
    expect(element.querySelectorAll('.linked-account').length).toBe(2);
    expect(element.textContent).toContain('MV001');
    expect(element.textContent).toContain('MV002');
    expect(element.querySelectorAll('.account-balance')[0].textContent).toMatch(/0,00/);
  });
  it('altera somente o status, sem seletor ou envio de perfil', async () => {
    const api = TestBed.inject(AdminService);
    const update = spyOn(api, 'update').and.returnValue(of({ ...users[0], status: 'BLOCKED', version: 1 }));
    const element: HTMLElement = fixture.nativeElement;
    (element.querySelector('tbody button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(element.querySelector('#admin-role')).toBeNull();
    const status = element.querySelector('#admin-status') as HTMLSelectElement;
    status.value = 'BLOCKED';
    status.dispatchEvent(new Event('change'));
    const reason = element.querySelector('#admin-reason') as HTMLTextAreaElement;
    reason.value = 'Teste de bloqueio';
    reason.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (element.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    expect(update).toHaveBeenCalledWith('one', {
      status: 'BLOCKED', reason: 'Teste de bloqueio', version: 0
    });
  });

});

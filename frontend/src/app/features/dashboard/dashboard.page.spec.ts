import { CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { DashboardOverview } from '../../core/models/banking.models';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AuthStore } from '../../core/state/auth.store';
import { UserRole } from '../../core/models/auth.models';
import { AdminService } from '../../core/services/admin.service';
import { DashboardPage } from './dashboard.page';

const overviewFixture: DashboardOverview = {
  accounts: [
    { id: 'acc-1', label: 'Conta corrente', agency: '0001', number: '12345-6', balance: 1000, currency: 'BRL' }
  ],
  investments: [],
  cards: [],
  transactions: [
    { id: 'trx-1', date: new Date().toISOString(), description: 'Recebimento via TED', category: 'Recebimentos', type: 'entrada', status: 'concluido', amount: 1000, channel: 'app' },
    { id: 'trx-2', date: new Date().toISOString(), description: 'Compra dividida',
      category: 'Transferências', type: 'transferencia', status: 'concluido', amount: -50,
      channel: 'internet banking', counterpartyName: 'Destinatário Exemplo',
      counterpartyAgency: '0001', counterpartyAccount: '••••8899' }
  ],
  cashflow: [{ label: 'Jan', value: 1000 }],
  expensesByCategory: [{ label: 'Cartões', value: 400 }]
};

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  const selectedRole = signal<UserRole>('cliente');
  const adminService = {
    summary: jasmine.createSpy('summary').and.returnValue(of({ totalUsers: 14, activeUsers: 12, blockedUsers: 2, totalAccounts: 21, activeAccounts: 20, auditedChanges: 4 })),
    users: jasmine.createSpy('users').and.returnValue(of([{ id: 'u1', name: 'Cliente Exemplo', email: 'teste@example.test', role: 'CLIENT', status: 'ACTIVE', demo: false, accounts: [], version: 1 }])),
    events: jasmine.createSpy('events').and.returnValue(of([]))
  };

  beforeEach(async () => {
    selectedRole.set('cliente');
    adminService.summary.calls.reset();
    adminService.users.calls.reset();
    adminService.events.calls.reset();
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        CurrencyPipe,
        DatePipe,
        PercentPipe,
        provideRouter([]),
        provideHttpClient(),
        { provide: AuthStore, useValue: { viewRole: selectedRole, role: selectedRole, isDemo: () => true, displayName: () => 'Cliente Exemplo' } },
        { provide: AdminService, useValue: adminService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { overview: overviewFixture } } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar a página de dashboard', () => {
    expect(component).toBeTruthy();
  });

  it('mostra o destinatário no extrato recente de transferências enviadas', () => {
    expect(fixture.nativeElement.textContent).toContain('Enviado para Destinatário Exemplo');
    expect(fixture.nativeElement.textContent).toContain('••••8899');
  });

  it('cliente vê saldo, atalhos e extrato sem controles administrativos', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Saldo das contas');
    expect(text).toContain('Transferir');
    expect(text).toContain('Extrato recente');
    expect(text).not.toContain('Gestão de usuários');
    expect(adminService.summary).not.toHaveBeenCalled();
  });

  it('gerente vê indicadores reais e consulta, mas não auditoria', () => {
    fixture.destroy();
    selectedRole.set('gerente');
    fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Visão do gerente');
    expect(text).toContain('Usuários pessoais');
    expect(text).toContain('Cliente Exemplo');
    expect(text).not.toContain('Abrir auditoria');
    expect(text).not.toContain('Extrato recente');
    expect(adminService.summary).toHaveBeenCalled();
    expect(adminService.events).not.toHaveBeenCalled();
  });

  it('administrador vê auditoria e controles de acesso', () => {
    fixture.destroy();
    selectedRole.set('admin');
    fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Visão administrativa');
    expect(text).toContain('Abrir auditoria');
    expect(text).toContain('Gerenciar usuários');
    expect(adminService.events).toHaveBeenCalled();
  });

  it('não mostra cartões ou investimentos fictícios', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toContain('CDB demonstrativo');
    expect(text).not.toContain('Visa');
  });
});

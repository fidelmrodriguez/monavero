import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { loginRedirectGuard } from './core/guards/login-redirect.guard';
import { dashboardResolver } from './core/resolvers/dashboard.resolver';
import { ShellComponent } from './layout/shell/shell.component';

export const appRoutes: Routes = [
  {
    path: 'login',
    canActivate: [loginRedirectGuard],
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage)
  },
  {
    path: 'app',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        resolve: { overview: dashboardResolver },
        loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage)
      },
      {
        path: 'extrato',
        loadComponent: () => import('./features/statement/statement.page').then((m) => m.StatementPage)
      },
      {
        path: 'transferencias',
        loadComponent: () => import('./features/transfers/transfers.page').then((m) => m.TransfersPage)
      },
      {
        path: 'pagamentos',
        loadComponent: () => import('./features/payments/payments.page').then((m) => m.PaymentsPage)
      },
      {
        path: 'notificacoes',
        loadComponent: () => import('./features/notifications/notifications.page').then((m) => m.NotificationsPage)
      },
      {
        path: 'auditoria',
        canActivate: [permissionGuard],
        data: { roles: ['gerente', 'admin'] },
        loadComponent: () => import('./features/audit/audit.page').then((m) => m.AuditPage)
      },
      {
        path: 'administracao',
        canActivate: [permissionGuard],
        data: { roles: ['admin'] },
        loadComponent: () => import('./features/admin/admin.page').then((m) => m.AdminPage)
      },
      {
        path: 'perfil',
        loadComponent: () => import('./features/profile/profile.page').then((m) => m.ProfilePage)
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      }
    ]
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: '**',
    redirectTo: 'app/dashboard'
  }
];

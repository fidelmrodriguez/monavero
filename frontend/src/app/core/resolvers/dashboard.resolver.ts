import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { DashboardOverview } from '../models/banking.models';
import { BankingService } from '../services/banking.service';
import { AuditStore } from '../state/audit.store';
import { AuthStore } from '../state/auth.store';

export const dashboardResolver: ResolveFn<DashboardOverview> = () => {
  const auditStore = inject(AuditStore);
  const authStore = inject(AuthStore);
  auditStore.register('Consulta de dashboard', 'Dashboard', 'sucesso', authStore.role());
  return inject(BankingService).getOverview();
};

import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Permissões administrativas reais dependem das APIs da etapa de administração. */
@Component({
  selector: 'app-admin-page',
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminPage {}

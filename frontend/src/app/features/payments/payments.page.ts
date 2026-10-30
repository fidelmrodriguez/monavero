import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Pagamentos serão disponibilizados quando houver endpoint persistente e autorizado. */
@Component({
  selector: 'app-payments-page',
  templateUrl: './payments.page.html',
  styleUrl: './payments.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentsPage {}

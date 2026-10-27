import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditStore } from '../../core/state/audit.store';

@Component({
  selector: 'app-audit-page',
  imports: [FormsModule, DatePipe],
  templateUrl: './audit.page.html',
  styleUrl: './audit.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditPage {
  private readonly auditStore = inject(AuditStore);
  protected readonly searchText = signal('');
  protected readonly filteredEntries = computed(() => {
    const search = this.searchText().toLowerCase().trim();
    return this.auditStore.entries().filter((entry) => !search || `${entry.action} ${entry.area} ${entry.status} ${entry.role}`.toLowerCase().includes(search));
  });
}

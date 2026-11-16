import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MONAVERO_API_URL } from '../config/monavero-api';

export type DemoCardStatus = 'ACTIVE' | 'BLOCKED' | 'CANCELED';
export interface DemoCard {
  id: string;
  label: string;
  lastFour: string;
  status: DemoCardStatus;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class CardService {
  private readonly http = inject(HttpClient);
  private readonly url = `${MONAVERO_API_URL}/api/v1/cards`;

  list(): Observable<DemoCard[]> { return this.http.get<DemoCard[]>(this.url); }
  create(label: string): Observable<DemoCard> { return this.http.post<DemoCard>(this.url, { label }); }
  change(id: string, action: 'block' | 'unblock' | 'cancel'): Observable<DemoCard> {
    return this.http.patch<DemoCard>(`${this.url}/${id}/${action}`, {});
  }
}

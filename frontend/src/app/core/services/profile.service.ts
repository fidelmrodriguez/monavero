import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MONAVERO_API_URL } from '../config/monavero-api';
import { AuthProfile } from '../models/auth.models';

export interface ProfileSession {
  id: string;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly url = `${MONAVERO_API_URL}/api/v1/profile`;

  rename(name: string): Observable<AuthProfile> { return this.http.patch<AuthProfile>(this.url, { name }); }
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.url}/password`, { currentPassword, newPassword });
  }
  sessions(): Observable<ProfileSession[]> { return this.http.get<ProfileSession[]>(`${this.url}/sessions`); }
  revokeSession(id: string): Observable<void> { return this.http.delete<void>(`${this.url}/sessions/${id}`); }
}

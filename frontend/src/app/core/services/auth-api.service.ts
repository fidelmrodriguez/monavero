import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthProfile, AuthResponse } from '../models/auth.models';
import { MONAVERO_API_URL } from '../config/monavero-api';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${MONAVERO_API_URL}/api/v1/auth`;

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.url}/login`, { email, password });
  }

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.url}/register`, { name, email, password });
  }

  demo(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.url}/demo`, {});
  }

  me(): Observable<AuthProfile> {
    return this.http.get<AuthProfile>(`${this.url}/me`);
  }

  logout(token: string): Observable<void> {
    return this.http.post<void>(`${this.url}/logout`, {}, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }
}

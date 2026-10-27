import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ExternalLoginResponse } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://dummyjson.com';

  login(username: string, password: string): Observable<ExternalLoginResponse> {
    const normalizedUsername = username.trim().toLowerCase();
    const credentials = normalizedUsername === 'user' && password === '1234'
      ? { username: 'emilys', password: 'emilyspass' }
      : { username, password };

    return this.http.post<ExternalLoginResponse>(`${this.baseUrl}/auth/login`, {
      ...credentials,
      expiresInMins: 60
    });
  }
}

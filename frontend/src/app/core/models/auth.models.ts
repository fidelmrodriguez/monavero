export type UserRole = 'cliente' | 'gerente' | 'admin';

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  id: number;
  username: string;
  role: UserRole;
  displayName: 'User';
}

export interface ExternalLoginResponse {
  id: number;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  image?: string;
  accessToken?: string;
  token?: string;
  refreshToken?: string;
}

export type UserRole = 'cliente' | 'gerente' | 'admin';

export interface AuthProfile {
  id: string;
  email: string;
  name: string;
  role: 'CLIENT' | 'MANAGER' | 'ADMIN';
  demo: boolean;
}

export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  user: AuthProfile;
}

export interface AuthSession extends AuthResponse {
  // Esta informação é apenas visual. O backend sempre verifica o token e o perfil.
  role: UserRole;
  displayName: string;
}

export function toRole(value: AuthProfile['role']): UserRole {
  return value === 'ADMIN' ? 'admin' : value === 'MANAGER' ? 'gerente' : 'cliente';
}

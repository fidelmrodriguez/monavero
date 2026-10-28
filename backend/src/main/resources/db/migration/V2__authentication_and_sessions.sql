-- Etapa 4: credenciais e sessões opacas, sem modificar a migração V1 em produção.
ALTER TABLE app_users
    ADD COLUMN password_hash VARCHAR(255),
    ADD COLUMN access_role VARCHAR(16) NOT NULL DEFAULT 'CLIENT',
    ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    ADD CONSTRAINT ck_app_users_access_role CHECK (access_role IN ('CLIENT', 'MANAGER', 'ADMIN'));

-- Registros legados sem hash não podem autenticar por senha até provisionamento específico.
CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    CONSTRAINT ck_auth_sessions_expiry CHECK (expires_at > created_at)
);
CREATE INDEX ix_auth_sessions_user ON auth_sessions (user_id);
CREATE INDEX ix_auth_sessions_expiry ON auth_sessions (expires_at);

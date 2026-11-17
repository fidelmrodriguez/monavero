-- A escolha de perfil demo passa a ser autenticada por sessão no backend.
-- Sessões demonstrativas antigas mantêm o perfil ADMIN até expirar ou serem revogadas.
ALTER TABLE auth_sessions ADD COLUMN demo_role VARCHAR(16);
ALTER TABLE auth_sessions ADD CONSTRAINT ck_auth_sessions_demo_role
  CHECK (demo_role IS NULL OR demo_role IN ('CLIENT', 'MANAGER', 'ADMIN'));

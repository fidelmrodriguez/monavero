-- Etapa 4: alinhar tipo SQL à representação JDBC padrão de String do Hibernate 7.
-- PostgreSQL CHAR(64) (bpchar / Types.CHAR) da V2 diverge de VARCHAR / Types.VARCHAR.
-- Os hashes SHA-256 são hexadecimais com 64 caracteres; não há preenchimento a preservar.
-- A alteração mantém os registros, a constraint UNIQUE e os índices existentes.
ALTER TABLE auth_sessions
    ALTER COLUMN token_hash TYPE VARCHAR(64)
    USING btrim(token_hash)::VARCHAR(64);

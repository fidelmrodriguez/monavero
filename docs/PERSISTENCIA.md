# Persistência e migrações

O Monavero utiliza **PostgreSQL 18 no Neon**, gerenciado por migrações **Flyway**. Os dados financeiros são ilustrativos, mas a persistência e as operações entre contas são executadas efetivamente no banco. A aplicação não realiza movimentação monetária real.

## Histórico versionado

| Migração | Responsabilidade |
| --- | --- |
| V1 | `app_users`, `bank_accounts`, `account_holders`, índices, chaves estrangeiras e restrições iniciais |
| V2 | Credenciais BCrypt, papéis de acesso, identificação de demonstração e `auth_sessions` |
| V3 | Ajuste de tipo da coluna `auth_sessions.token_hash` para compatibilidade JDBC |
| V4 | Lançamentos `account_transactions` e provisionamento de contas/saldos da demonstração |
| V5 | `bank_transfers`, vínculo `transfer_id` entre lançamentos e transferência, idempotência e integridade referencial |

**Nunca editar migrações já aplicadas** em um ambiente compartilhado. O Flyway valida histórico e checksums antes de avançar a versão. O Hibernate usa `ddl-auto=validate` e não cria tabelas automaticamente.

## Invariantes e integridade

- Titularidade de conta vinculada a `app_users`, com permissões financeiras validadas no backend.
- Saldo persistido em `NUMERIC(19,2)`; os valores não são calculados a partir de amostras JSON no frontend.
- Transferência interna usa transação de banco única: debita origem, credita destino e grava os dois lançamentos correlacionados.
- Contas envolvidas são bloqueadas durante a execução para evitar concorrência inconsistente.
- A chave de idempotência associa uma tentativa do solicitante ao comprovante já gerado, evitando duplicação em retentativas.
- Acesso de demonstração não pode transferir saldo para contas pessoais.

## Conexão e segredos

Na Blitz, definir `MONAVERO_DB_JDBC_URL`, `MONAVERO_DB_USERNAME` e `MONAVERO_DB_PASSWORD` como variáveis privadas, com TLS obrigatório. Nunca copiar credenciais para o frontend, commits, prints ou documentação. A versão dos schemas deve ser confirmada no Neon ou nos logs de inicialização do Flyway.

## Consultas seguras para verificação

```sql
SELECT installed_rank, version, description, success
FROM flyway_schema_history
ORDER BY installed_rank;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'app_users', 'bank_accounts', 'account_holders',
    'auth_sessions', 'account_transactions', 'bank_transfers'
  )
ORDER BY table_name;
```

A aplicação é avaliada com testes Java de integração que utilizam **PostgreSQL 18 efêmero em Testcontainers**, sem conexão ao banco Neon usado pela API publicada.

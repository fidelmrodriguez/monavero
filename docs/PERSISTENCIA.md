# Persistência e esquema inicial · Etapa 3

O backend do Monavero utiliza PostgreSQL 18 no Neon e Flyway para versionamento do banco. A Etapa 3 prepara **armazenamento de dados fictícios**, não autenticação, saldo operacional nem operações financeiras reais.

## Modelo relacional V1

| Tabela | Objetivo | Regras principais |
| --- | --- | --- |
| `app_users` | Identidade básica, sem credenciais nesta etapa | UUID, nome, e-mail único de forma case-insensitive, estado `ACTIVE` ou `BLOCKED` |
| `bank_accounts` | Contas fictícias | UUID, número único, agência, tipo `CHECKING`/`SAVINGS`, moeda BRL, estado, saldo decimal não negativo inicialmente zero |
| `account_holders` | Relação de titularidade | FK de conta e usuário, vínculo único por par, papel `PRIMARY` ou `CO_HOLDER`, no máximo um principal por conta |
| `flyway_schema_history` | Controle de migrações do Flyway | Criada e gerida pelo Flyway, não deve ser editada manualmente |

O esquema inclui índices por e-mail normalizado e usuário titular, FKs restritivas, `CHECK` para estados válidos e saldo não negativo, `NUMERIC(19,2)` para valores e `TIMESTAMPTZ` para timestamps.

A titularidade com papel principal **não é criada automaticamente**; o futuro serviço de abertura de conta deverá criar o vínculo principal de forma transacional. A regra SQL impede dois titulares principais da mesma conta. Uma conta pode, nesta etapa, existir sem titular, porque não há ainda um fluxo de cadastro bancário exposto.

Os IDs de usuários e contas são UUIDs; o relacionamento de titularidade no Java usa IDs escalares para manter os módulos desacoplados, mas as restrições FK continuam valendo no PostgreSQL.

## Limites atuais

- Nenhum usuário ou conta é criado automaticamente em produção.
- Não há senha, token, dados pessoais reais ou seed de demonstração nesta etapa.
- O `balance` é iniciado em zero e não há serviços públicos que o alterem. Na Etapa 6, as operações exigirão livro de lançamentos, idempotência e controle de concorrência; o esquema será ampliado por novas migrações.
- O frontend Angular usa a API Java para autenticação; somente os dados financeiros fictícios continuam vindo da DummyJSON, independentes do Neon.
- Nenhum endpoint de leitura ou escrita de usuário, conta ou titularidade é exposto sem Spring Security (Etapa 4).

## Migrações

A primeira migração está em `backend/src/main/resources/db/migration/V1__initial_banking_schema.sql`. A cada nova etapa, adicionar `V2__...sql`, `V3__...sql` etc. Nunca alterar um arquivo V1 já executado num ambiente publicado; isso provoca divergências de checksum e impede um deploy limpo.

O Flyway migra no início da aplicação. O Hibernate utiliza `ddl-auto=validate` para verificar o mapeamento, sem gerar tabelas. O banco não é apagado no build nem no deploy. `clean-disabled=true` impede limpeza por Flyway durante operação normal.

## Banco e credenciais

Na Blitz Cloud, configure `MONAVERO_DB_JDBC_URL`, `MONAVERO_DB_USERNAME` e `MONAVERO_DB_PASSWORD` em **Environment**. Utilize o host de **conexão direta** do Neon (sem o sufixo `-pooler`) e SSL obrigatório. Não publique senhas nem a string completa em README, prints, logs ou commits.

O serviço de aplicações mantém um pool pequeno (máximo de três conexões), apropriado para a fase inicial e os limites do plano gratuito; migrações e sessões JDBC compartilham a conexão direta nesta fase. Ajustes de pool e papéis de menor privilégio podem ser feitos em etapas posteriores.

## Verificação sem expor dados sensíveis

Após o deploy, no Neon SQL Editor do projeto `monavero` e branch `production`, execute apenas consultas de metadados:

```sql
SELECT installed_rank, version, description, success
FROM flyway_schema_history
ORDER BY installed_rank;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('app_users', 'bank_accounts', 'account_holders')
ORDER BY table_name;
```

Resultado esperado: histórico Flyway com migração `1` bem-sucedida e três tabelas de negócio. Não há necessidade de compartilhar dados de tabelas ou credenciais.

Os testes de integração usam Testcontainers com PostgreSQL 18 efêmero no CI; **nunca** o banco Neon de produção.


## Migração V2 — credenciais e sessões

O arquivo `V2__authentication_and_sessions.sql` adiciona `password_hash` (BCrypt, anulável para compatibilidade com registros anteriores), `access_role` e `is_demo` em `app_users`, além da tabela `auth_sessions`. O banco guarda **somente SHA-256 do token de sessão**, nunca o token original. Sessões expiram em 12 horas e podem ser revogadas. O Flyway mantém V1 imutável.

Esta migração não cria contas bancárias novas nem lançamentos financeiros. O bootstrap da conta demo não cria senha pública de banco; somente associa um usuário marcado como demonstração ao endpoint `/demo`.

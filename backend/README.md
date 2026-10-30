# Monavero · API Java

Backend transacional de um banco digital **demonstrativo**. Não movimenta moeda real nem permite depósitos, PIX, TED ou recargas financeiras. Ver [visão geral](../README.md), [arquitetura](../docs/ARQUITETURA.md), [persistência](../docs/PERSISTENCIA.md) e [testes](../docs/TESTES.md).

## Stack

Java 25, Spring Boot 4.1.1, Spring Security e BCrypt, tokens opacos com sessão revogável, Spring Data JPA/Hibernate, PostgreSQL 18 (Neon), Flyway V1–V7, Spring Modulith, MockMvc e Testcontainers.

## Funcionalidades

- `POST /api/v1/auth/register`: cria usuário pessoal e sessão.
- `POST /api/v1/auth/login`, `/demo`, `/logout`: sessão pessoal, identidade pública e revogação.
- `GET /api/v1/auth/me`: identidade autenticada.
- `GET /api/v1/banking/overview`: contas e extrato vinculados ao titular, com dados persistidos.
- `POST /api/v1/banking/transfers`: transferência interna imediata entre contas, inclusive entre usuários pessoais distintos; valida origem, destino, saldo, status e limites, com débito e crédito transacionais e chave de idempotência.
- `POST /api/v1/banking/scheduled-transfers`: cadastra transferência futura com chave de idempotência.
- `GET /api/v1/banking/scheduled-transfers`: lista somente agendamentos do titular.
- `DELETE /api/v1/banking/scheduled-transfers/{id}`: cancela enquanto pendente.
- Processamento automático no vencimento por `@Scheduled`, com trava PostgreSQL, execução transacional e recuperação após reinício do processo.
- `GET /actuator/health`: disponibilidade da API.

### Crédito de abertura no ambiente de demonstração

Uma conta **pessoal** nova recebe **R$ 1.000,00 fictícios**, com lançamento de crédito em seu extrato, no primeiro acesso ao módulo bancário. Para contas pessoais anteriores à migração V6, o mesmo crédito é aplicado só quando a conta estiver sem saldo e sem lançamentos. Um marcador persistido na conta e uma trava transacional por usuário evitam créditos duplicados ao atualizar a página, fazer novo login ou consultar simultaneamente. Contas com histórico não são alteradas. Não existe endpoint para recarregar saldo. A conta pública `User / 1234` mantém seu saldo de demonstração separado e não pode enviar/receber transferências com contas pessoais.

A regra pode ser parametrizada por `MONAVERO_PERSONAL_OPENING_CREDIT` (padrão `1000.00`, até `10000.00`; `0` desabilita). Não se destina a ambientes com recursos reais.

## Configuração e execução

Defina as variáveis privadas `MONAVERO_DB_JDBC_URL`, `MONAVERO_DB_USERNAME`, `MONAVERO_DB_PASSWORD`, `MONAVERO_CORS_ALLOWED_ORIGINS` e opcionalmente `MONAVERO_DEMO_ENABLED` / `MONAVERO_PERSONAL_OPENING_CREDIT`. Nunca versionar segredos ou credenciais.

```bash
cd backend
mvn -B clean verify
mvn spring-boot:run
```

Os testes integrados usam PostgreSQL 18 em Testcontainers; Docker e JDK 25 são necessários para executá-los. Hibernate `ddl-auto=validate`, Flyway `clean-disabled=true`. Migrações V1–V5 existentes não foram editadas; V6 acrescenta apenas o marcador de concessão única.

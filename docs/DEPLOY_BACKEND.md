# Deploy do backend — Blitz Cloud

A API Java 25 / Spring Boot 4.1.1 é publicada como serviço independente na Blitz Cloud, com PostgreSQL gerenciado no Neon. O Angular é publicado separadamente no Netlify.

## Infraestrutura

| Camada | Serviço | Configuração |
| --- | --- | --- |
| Frontend | Netlify | Angular SPA; domínio público `https://monavero.netlify.app` |
| Backend | Blitz Cloud | `https://monavero-api.fidelmrodriguez.blitz.cloud` |
| Banco | Neon | PostgreSQL 18; conexão TLS direta, credenciais privadas |

## Configuração do backend

Na Blitz, mantenha o repositório `fidelmrodriguez/monavero`, branch `main`, pasta de build `backend`, Dockerfile `backend/Dockerfile`, porta `8080` (ou `PORT` fornecida pelo ambiente) e sem banco nativo da Blitz.

Variáveis de ambiente:

| Variável | Uso |
| --- | --- |
| `MONAVERO_DB_JDBC_URL` | JDBC da conexão PostgreSQL direta, incluindo `sslmode=require` |
| `MONAVERO_DB_USERNAME` | Usuário do PostgreSQL |
| `MONAVERO_DB_PASSWORD` | Senha do PostgreSQL |
| `MONAVERO_CORS_ALLOWED_ORIGINS` | Origem exata do Netlify, sem barra final |
| `MONAVERO_DEMO_ENABLED` | Opcional; `false` desabilita o login compartilhado de demonstração |
| `PORT` | Opcional; porta HTTP, quando definida pelo provedor |

Para obter os dados do Neon, use **Connect** na branch de produção, com conexão direta (sem `-pooler`). Converta o host para o formato JDBC, sem usuário ou senha na URL:

```text
jdbc:postgresql://HOST-DIRETO:5432/neondb?sslmode=require
```

Não coloque senhas, tokens, strings privadas de conexão ou segredos em commits, documentação ou frontend. Não faça DDL manual no Neon: migrações Flyway são aplicadas automaticamente pela API durante a inicialização. **Nunca modifique arquivos Flyway que já tenham sido executados**, mesmo para alterar comentários, pois isso pode invalidar os checksums.

## Publicação e verificação

1. Faça push das alterações para `main` e confirme os workflows **Backend Java CI** e **Frontend Angular CI**.
2. Confira o deploy do backend na Blitz e o da SPA no Netlify; o primeiro acesso pode demorar quando a hospedagem gratuita estiver em repouso.
3. Verifique `GET /actuator/health` com `status: UP` e `GET /api/v1/system/info` na API publicada.
4. Confirme o contrato em `/swagger-ui.html`, a autenticação e a separação de dados por usuário.
5. Consulte `flyway_schema_history` no Neon para verificar se as migrações foram aplicadas com sucesso, sem executar `repair` indiscriminadamente.
6. Valide login, logout, transferências, pagamentos, agendamentos, notificações, cartões e acesso por perfil no site publicado. Use [Testes](TESTES.md).

## Diagnóstico

| Sintoma | Verificação |
| --- | --- |
| `Could not resolve placeholder` | Variáveis de banco ausentes no backend |
| Falha de conexão PostgreSQL | Host direto, senha, porta e TLS, sem divulgar os valores |
| `Failed to validate schema` | Histórico Flyway, esquema existente e mapeamento Hibernate |
| `Flyway checksum mismatch` | Restaurar o arquivo SQL original já aplicado; não editar históricos |
| Testcontainers indisponível no CI | Runner, Docker e logs do Maven |
| Login ou endpoint retorna `401/403` | Sessão válida, papel demo selecionado e autorização do backend |
| API lenta após inatividade | Reinicialização do serviço sob demanda; execução de jobs pendentes ocorre com API ativa |

O produto é demonstrativo. O backend não realiza PIX, TED ou liquidação de pagamentos externos reais.

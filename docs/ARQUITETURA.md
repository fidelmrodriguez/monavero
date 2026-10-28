# Arquitetura · Monavero

O Monavero é um monorepositório organizado em **frontend Angular** e **backend Java com módulos de persistência**. O frontend Angular está implementado e as Etapas 2 e 3 acrescentam a API HTTP e o modelo relacional inicial PostgreSQL, ainda sem operações financeiras. A integração com a API própria será adicionada progressivamente, sem descartar a experiência demonstrativa já existente.

## Arquitetura atual

```text
Navegador
   │
   ▼
Netlify — Angular 19 (SSR + hidratação)
   │
   ├── Sessão demonstrativa no navegador
   ├── Guards e estados de interface
   ├── Dados financeiros fictícios / fallback local
   │
   └── HTTPS → DummyJSON (autenticação e recursos públicos)
```

A DummyJSON fornece recursos públicos que a interface transforma em dados financeiros fictícios. Ela **não** é um serviço bancário nem mantém contas Monavero. As transferências apenas notificam o usuário; os pagamentos agendados existem em memória durante a execução da aplicação.

## Estrutura atual do Angular

| Pasta ou arquivo | Responsabilidade |
| --- | --- |
| `frontend/src/app/core/models/` | Tipos e contratos usados pela interface. |
| `frontend/src/app/core/services/auth-api.service.ts` | Login demonstrativo na DummyJSON. |
| `frontend/src/app/core/services/banking.service.ts` | Adaptação e fallback de dados financeiros fictícios e pagamentos em memória. |
| `frontend/src/app/core/state/` | Sessão, notificações, auditoria local e preferências de tema. |
| `frontend/src/app/core/guards/` | Proteção de rotas com base na sessão e no perfil visual. |
| `frontend/src/app/core/resolvers/` | Carregamento de dados antes do dashboard. |
| `frontend/src/app/features/` | Páginas de login, dashboard, extrato, transferências, pagamentos e gestão. |
| `frontend/src/app/layout/` e `shared/` | Navegação e componentes reutilizáveis. |
| `frontend/src/app/app.config.ts` | Angular Router, hidratação, HttpClient e locale pt-BR. |
| `frontend/server.ts` | Integração SSR com o runtime Angular do Netlify. |

A navegação usa componentes standalone, lazy loading, Angular Router, formulários reativos, Signals e RxJS. A autenticação de demonstração utiliza a chave `monavero-session` em `localStorage` e não é adequada a dados reais.

## Fluxos atuais

### Autenticação

1. O usuário vê `User` / `1234` pré-preenchidos e pode editar ambos os campos.
2. `AuthApiService` converte esse par demonstrativo para uma conta pública de teste e faz login na DummyJSON.
3. `AuthStore` mantém o token de teste e o papel visual (`cliente`, `gerente`, `admin`) no navegador.
4. Os guards habilitam a navegação de acordo com o estado local; o servidor externo **não certifica papéis bancários**.
5. O logout remove a sessão do navegador.

### Dados financeiros

`BankingService` consome dados públicos da DummyJSON (`/users`, `/products`, `/carts`) e monta contas, cartões, investimentos e transações fictícias. A consulta dispõe de fallback local. O saldo exibido não é modificado pela transferência demonstrativa. Agendamentos de pagamento não sobrevivem a uma reinicialização da aplicação.

## Backend Java: Etapas 2 e 3

A API está separada em `backend/`, utilizando Java 25, Spring Boot 4.1.1, Spring Modulith 2.1.1, Spring MVC, OpenAPI e Actuator. O pacote `system/` disponibiliza `GET /api/v1/system/info`; o Actuator expõe `GET /actuator/health` e o Swagger fica em `/swagger-ui.html`. `config/` concentra configuração de CORS por origem explícita, metadados da API e respostas de validação no formato Problem Details.

A Etapa 3 introduz `identity/` (usuários) e `accounts/` (contas e titularidade), Spring Data JPA e Flyway. A migração V1 define `app_users`, `bank_accounts` e `account_holders`, com PKs UUID, FKs, índices e restrições SQL. O backend exige variáveis privadas para conectar ao Neon, utiliza Hibernate em modo `validate` e mantém testes isolados com Testcontainers. O Angular **ainda não se comunica com esta API**. Não há autenticação, endpoints bancários ou operações financeiras no Java. Consulte o [README do backend](../backend/README.md) e o [guia de deploy](DEPLOY_BACKEND.md).

## Arquitetura-alvo

```text
Navegador
   │
   ▼
Netlify — Angular
   │ HTTPS / JSON (a partir da integração)
   ▼
API Monavero — Java + Spring Boot / Spring Modulith
   ├── identidade e autorização
   ├── contas e lançamentos
   ├── transferências e pagamentos demonstrativos
   └── auditoria e observabilidade
   │ JDBC / TLS
   ▼
PostgreSQL — banco de demonstração
```

O servidor Java deverá decidir identidade, permissões e titularidade, validar valores e manter a consistência dos dados financeiros. O Angular continuará responsável por apresentação, estados visuais e feedback. O modelo relacional inicial existe na Etapa 3, mas endpoints HTTP bancários e regras de segurança entrarão apenas nas etapas apropriadas. Consulte [Persistência](PERSISTENCIA.md).

## Segurança e isolamento

**Estado atual:** token externo de teste no navegador, guards avaliados no cliente e eventos locais. Não usar a aplicação para transações reais nem senhas pessoais.

**Estado atual de persistência:** Flyway, JPA e FKs SQL implantáveis; a configuração de acesso ao Neon ainda depende das variáveis na Blitz. **Estado previsto:** Spring Security, isolamento por usuário, restrições por papel, registro de alterações críticas e operações transacionais. Dados sensíveis não devem ser incluídos em logs, README, commits ou variáveis públicas do frontend.

## Deploy e verificação

- O Netlify compila o projeto em `frontend/` e publica `dist/monavero/browser`; a configuração fica em `netlify.toml`.
- O workflow do frontend fica em `.github/workflows/frontend-ci.yml` e valida TypeScript, build e testes quando executado pelo GitHub Actions.
- `backend/` está publicado na Blitz (`https://monavero-api.fidelmrodriguez.blitz.cloud`) com health, info e Swagger. O deploy do modelo PostgreSQL V1 no Neon ainda precisa ser validado após o commit da Etapa 3; o Angular não está integrado à API.

Consulte [Frontend](../frontend/README.md), [Backend](../backend/README.md), [Testes](TESTES.md) e [Roadmap](ROADMAP.md).

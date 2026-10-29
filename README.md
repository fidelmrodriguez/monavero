# Monavero

**Monavero** é uma aplicação web de banco digital demonstrativo. A experiência de frontend é construída com **Angular 19 e TypeScript** e agora inclui uma **API Java com persistência inicial em PostgreSQL no Neon**. O projeto explora a evolução de uma interface financeira funcional para um sistema full stack; a persistência e a autenticação própria com Spring Security já estão implementadas; operações financeiras transacionais e auditoria persistida são etapas futuras.

[**Frontend · Angular**](frontend/README.md) · [**Backend · Java**](backend/README.md) · [Arquitetura](docs/ARQUITETURA.md) · [Roadmap](docs/ROADMAP.md) · [Testes](docs/TESTES.md) · [Autenticação](docs/SEGURANCA_AUTENTICACAO.md)

[![Frontend Angular CI](https://img.shields.io/github/actions/workflow/status/fidelmrodriguez/monavero/frontend-ci.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=Frontend%20CI)](https://github.com/fidelmrodriguez/monavero/actions/workflows/frontend-ci.yml)
[![Backend Java CI](https://img.shields.io/github/actions/workflow/status/fidelmrodriguez/monavero/backend-ci.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=Backend%20CI)](https://github.com/fidelmrodriguez/monavero/actions/workflows/backend-ci.yml)

> **Ambiente de demonstração:** Monavero não é um banco nem realiza operações financeiras reais. Contas, saldos, extratos, pagamentos, cartões e investimentos são fictícios. O login e o cadastro utilizam agora autenticação própria da API Java; não informe senhas pessoais ou dados bancários reais.

## Funcionalidades existentes

- **Acesso e cadastro:** autenticação na API Java, login demonstrativo, cadastro pessoal, logout e sessão revogável. Os papéis de acesso são definidos pelo servidor, sem seleção de admin pelo navegador.
- **Dashboard:** visão de contas, indicadores financeiros, gráfico SVG, cartões, investimentos e movimentações recentes.
- **Extrato:** pesquisa, filtros por período, tipo, status e valores, com totalização das movimentações exibidas.
- **Transferências:** formulários e validações de saldo, limite, favorecido e destino, com notificações e registro local de auditoria. **Nenhum valor é debitado ou creditado.**
- **Pagamentos:** registro demonstrativo de agendamentos em memória, sem processamento financeiro nem persistência.
- **Gestão:** telas de notificações, auditoria, administração e perfil; tema claro/escuro e navegação responsiva.

Os componentes e comportamentos de interface são detalhados no [README do frontend](frontend/README.md) e no [catálogo de funcionalidades](docs/FUNCIONALIDADES.md).

## Tecnologias

| Área | Implementado / previsto |
| --- | --- |
| Frontend implementado | Angular 19, TypeScript, SCSS, Signals, RxJS, Reactive Forms |
| Renderização implementada | Angular SSR, hidratação e event replay |
| Dados financeiros temporários | HttpClient com DummyJSON somente nos dados financeiros fictícios (não no login) |
| Testes frontend | Jasmine, Karma e Chrome Headless |
| Automação frontend | GitHub Actions (TypeScript, build e testes aprovados na Etapa 1) |
| Automação backend | GitHub Actions (Maven, Testcontainers e autenticação; validação da Etapa 4 pendente após commit) |
| Publicação frontend | Netlify, com build a partir de `frontend/` |
| Backend (implementado) | Java 25, Spring Boot 4.1.1, Spring MVC, Spring Modulith, Actuator e OpenAPI |
| Persistência (Etapa 3) | PostgreSQL 18 no Neon, Spring Data JPA, Hibernate e Flyway V1 validada; V2 de autenticação entregue para validação |
| Testes de persistência | PostgreSQL 18 temporário com Testcontainers em CI |
| Backend (próximas etapas) | Consultas bancárias e operações financeiras; autenticação com Spring Security já implementada |

## Arquitetura e estrutura

```text
monavero/
├── .github/workflows/       # CI independente do Angular e do Java
├── frontend/                # Angular, SSR, testes e recursos públicos
│   ├── src/app/
│   │   ├── core/            # Modelos, serviços, estado, guards e interceptors
│   │   ├── features/        # Telas do produto
│   │   ├── layout/          # Estrutura de navegação
│   │   └── shared/          # Componentes reutilizáveis
│   ├── public/
│   ├── package.json
│   └── README.md
├── backend/                 # API Java executável, testes, Dockerfile e README
├── docs/                    # Arquitetura, funcionalidades, testes e planejamento
├── netlify.toml             # Configuração do deploy Angular
└── README.md
```

**Estado atual:** o Angular utiliza a API Java para autenticação e a DummyJSON exclusivamente para os dados financeiros simulados. A API tem health, Swagger, persistência PostgreSQL e endpoints de cadastro, login, demonstração e logout. **Ainda não realiza operações financeiras nem expõe endpoints bancários**. A separação entre camadas já está organizada, e a migração ocorrerá de forma incremental conforme o [roadmap](docs/ROADMAP.md).

## Executar o frontend

Pré-requisitos: Node.js 22 e npm. Na raiz do repositório:

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:4200`. O formulário inicia com `User` / `1234` editáveis para acesso demonstrativo autenticado pela API Java; também é possível criar uma conta pessoal. O cadastro exige senha de pelo menos 12 caracteres. O frontend depende da API Java para autenticação.

```bash
npm run typecheck
npm run build
npm test
```

`npm test` precisa de Chrome/Chromium. O projeto ainda não possui `package-lock.json` versionado; a reprodução exata das dependências ficará garantida quando o lockfile puder ser gerado e commitado, passando a usar `npm ci`.

A configuração do Netlify utiliza `frontend/dist/monavero/browser` como diretório de publicação. Consulte [o guia de deploy](docs/DEPLOY_NETLIFY.md) para verificar SSR, rotas e comportamento em produção.

## Executar o backend

Com Java 25 e Maven 3.9+:

```bash
cd backend
mvn clean verify
mvn spring-boot:run
```

Antes de iniciar a API, configure `MONAVERO_DB_JDBC_URL`, `MONAVERO_DB_USERNAME` e `MONAVERO_DB_PASSWORD` (veja [Deploy do backend](docs/DEPLOY_BACKEND.md)); `mvn clean verify` utiliza PostgreSQL isolado com Testcontainers e não requer Neon. A API atende identificação, health e Swagger, além dos endpoints de autenticação em `/api/v1/auth/*`. Ela **já está ligada ao Angular para autenticação**, mas não para dados financeiros. Veja o [README do backend](backend/README.md) e o [guia de deploy](docs/DEPLOY_BACKEND.md).

## Documentação

- [Frontend Angular](frontend/README.md): telas, arquitetura, estado, testes e execução da interface.
- [Backend Java](backend/README.md): API, persistência, execução, endpoints e testes.
- [Persistência](docs/PERSISTENCIA.md): modelo de dados, regras e migrações Flyway.
- [Deploy do backend](docs/DEPLOY_BACKEND.md): Blitz, variáveis privadas de banco e validação das migrações no Neon.
- [Arquitetura](docs/ARQUITETURA.md): fluxo atual da aplicação e evolução para Angular + Java + PostgreSQL.
- [Funcionalidades](docs/FUNCIONALIDADES.md): escopo demonstrativo implementado.
- [Testes e CI](docs/TESTES.md): comandos, workflow e critérios de verificação.
- [Deploy no Netlify](docs/DEPLOY_NETLIFY.md): publicação do Angular SSR.
- [Roadmap](docs/ROADMAP.md): etapas 0 a 12 e critérios de conclusão.
- [Evolução técnica](docs/EVOLUCAO.md): estratégia de integração gradual com backend.

## Evolução

O objetivo é evoluir a autenticação já implementada com contas, extrato persistido, transferências internas atômicas, agendamentos, administração e auditoria. Tudo continuará sendo **simulação bancária**, sem integração com instituições financeiras, Pix real ou cobrança efetiva de boletos.

As Etapas 0 a 3 foram validadas, incluindo CI Java, Blitz e migração V1 no Neon. A Etapa 4 entrega autenticação própria, integração Angular e migração V2; sua validação exige ambos os workflows, novo deploy e teste completo de cadastro e login. Veja o [roadmap](docs/ROADMAP.md) para acompanhar o progresso e distinguir entregas planejadas das verificadas.


**Etapa 5 em validação:** API `GET /api/v1/banking/overview` e migração V4 para contas/extrato persistentes por usuário. Melhorias de recuperação da Blitz e navegação após login incluídas. Não considerar concluída sem CI e deploy validados.

### Etapa 6 — transferências internas (em validação)

Backend 0.6.0-SNAPSHOT: saldo e lançamentos atômicos, idempotência e autenticação por titularidade; Flyway V5. Frontend: formulário de transferência imediata, atualização de saldo/extrato e modo demo seguro com duas contas. Não há PIX real, agendamento ou movimentação de dinheiro verdadeiro. Validar CI de backend/frontend e deploy antes de marcar a etapa concluída.

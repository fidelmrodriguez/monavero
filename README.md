# Monavero

**Monavero** é uma aplicação web de banco digital demonstrativo. A experiência de frontend é construída com **Angular 19 e TypeScript** e agora inclui a **fundação de uma API Java com Spring Boot**. O projeto explora a evolução de uma interface financeira funcional para um sistema full stack com autenticação própria, dados persistidos, consistência transacional e auditoria.

[**Frontend · Angular**](frontend/README.md) · [**Backend · Java**](backend/README.md) · [Arquitetura](docs/ARQUITETURA.md) · [Roadmap](docs/ROADMAP.md) · [Testes](docs/TESTES.md)

[![Frontend Angular CI](https://img.shields.io/github/actions/workflow/status/fidelmrodriguez/monavero/frontend-ci.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=Frontend%20CI)](https://github.com/fidelmrodriguez/monavero/actions/workflows/frontend-ci.yml)
[![Backend Java CI](https://img.shields.io/github/actions/workflow/status/fidelmrodriguez/monavero/backend-ci.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=Backend%20CI)](https://github.com/fidelmrodriguez/monavero/actions/workflows/backend-ci.yml)

> **Ambiente de demonstração:** Monavero não é um banco nem realiza operações financeiras reais. Contas, saldos, extratos, pagamentos, cartões e investimentos são fictícios. O login usa temporariamente a API pública DummyJSON; não informe senhas pessoais ou dados bancários reais.

## Funcionalidades existentes

- **Acesso demonstrativo:** login e logout, restauração de sessão no navegador e seleção visual entre cliente, gerente e administrador. A escolha de perfil ainda não é autorizada por servidor bancário.
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
| Integração temporária | HttpClient com DummyJSON e fallback de dados fictícios |
| Testes frontend | Jasmine, Karma e Chrome Headless |
| Automação frontend | GitHub Actions (TypeScript, build e testes aprovados na Etapa 1) |
| Automação backend | GitHub Actions (Maven e testes; validação pendente após commit) |
| Publicação frontend | Netlify, com build a partir de `frontend/` |
| Backend (fundação implementada) | Java 25, Spring Boot 4.1.1, Spring MVC, Spring Modulith, Actuator e OpenAPI |
| Backend (próximas etapas) | Spring Security, autenticação, persistência e operações financeiras |
| Persistência planejada | PostgreSQL, Spring Data JPA e Flyway |

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

**Estado atual:** o Angular funciona de maneira independente. A API Java possui endpoint público de identificação, health check, Swagger, configuração CORS e testes, mas **não realiza login nem operações financeiras**. Ainda não há PostgreSQL integrado nem endpoints bancários. A separação entre camadas já está organizada, e a migração ocorrerá de forma incremental conforme o [roadmap](docs/ROADMAP.md).

## Executar o frontend

Pré-requisitos: Node.js 22 e npm. Na raiz do repositório:

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:4200`. O formulário apresenta as credenciais fictícias `User` / `1234`; essas credenciais de demonstração são convertidas para uma conta pública de teste da DummyJSON. O acesso requer conexão com a API externa.

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

A API atende `GET /api/v1/system/info`, `GET /actuator/health` e `/swagger-ui.html`. Ela **ainda não está ligada ao Angular**. Veja o [README do backend](backend/README.md) e o [guia de deploy](docs/DEPLOY_BACKEND.md).

## Documentação

- [Frontend Angular](frontend/README.md): telas, arquitetura, estado, testes e execução da interface.
- [Backend Java](backend/README.md): API Java existente, execução, endpoints, testes e limites da Etapa 2.
- [Deploy do backend](docs/DEPLOY_BACKEND.md): preparação Docker, variáveis e validação da API em nuvem.
- [Arquitetura](docs/ARQUITETURA.md): fluxo atual da aplicação e evolução para Angular + Java + PostgreSQL.
- [Funcionalidades](docs/FUNCIONALIDADES.md): escopo demonstrativo implementado.
- [Testes e CI](docs/TESTES.md): comandos, workflow e critérios de verificação.
- [Deploy no Netlify](docs/DEPLOY_NETLIFY.md): publicação do Angular SSR.
- [Roadmap](docs/ROADMAP.md): etapas 0 a 12 e critérios de conclusão.
- [Evolução técnica](docs/EVOLUCAO.md): estratégia de integração gradual com backend.

## Evolução

O objetivo é implementar gradualmente cadastro, autorização, contas, extrato persistido, transferências internas atômicas, agendamentos, administração e auditoria. Tudo continuará sendo **simulação bancária**, sem integração com instituições financeiras, Pix real ou cobrança efetiva de boletos.

As Etapas 0 e 1 foram validadas com o deploy do frontend e o GitHub Actions aprovado. A Etapa 2 entrega a fundação da API Java; sua validação requer o CI do backend e a publicação em serviço cloud, sem interromper o frontend demonstrativo. Veja o [roadmap](docs/ROADMAP.md) para acompanhar o progresso e distinguir entregas planejadas das verificadas.

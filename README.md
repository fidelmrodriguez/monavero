# Monavero

**Monavero** é uma aplicação de banco digital demonstrativo, construída como projeto de engenharia full stack. A interface oferece uma experiência de produto para clientes; os fluxos financeiros são executados sobre dados de demonstração, sem movimentação de dinheiro real.

[**Aplicação**](https://monavero.netlify.app) · [Frontend Angular](frontend/README.md) · [Backend Java](backend/README.md) · [Arquitetura](docs/ARQUITETURA.md) · [Funcionalidades](docs/FUNCIONALIDADES.md) · [Roadmap](docs/ROADMAP.md)

[![Frontend Angular CI](https://img.shields.io/github/actions/workflow/status/fidelmrodriguez/monavero/frontend-ci.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=Frontend%20CI)](https://github.com/fidelmrodriguez/monavero/actions/workflows/frontend-ci.yml)
[![Backend Java CI](https://img.shields.io/github/actions/workflow/status/fidelmrodriguez/monavero/backend-ci.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=Backend%20CI)](https://github.com/fidelmrodriguez/monavero/actions/workflows/backend-ci.yml)

> **Aviso:** projeto de demonstração. Não deposite valores nem utilize dados bancários ou senhas reais. PIX, TED, boletos, cartões e investimentos reais não são processados.

## Funcionalidades

| Área | Implementação atual |
| --- | --- |
| Autenticação | Cadastro e login na API Java, BCrypt, sessão opaca persistida, logout e proteção de rotas |
| Contas | Contas e saldos por titular, persistidos no PostgreSQL |
| Dashboard | Visão consolidada de contas e movimentações; cartões e investimentos apresentados como dados ilustrativos |
| Extrato | Lançamentos persistentes, pesquisa e filtros |
| Transferências | Operações imediatas entre contas Monavero com débito/crédito atômicos, validações no backend e idempotência |
| Pagamentos | Fluxo demonstrativo no frontend; persistência e processamento serão implementados em etapa posterior |
| Outros | Notificações, perfil, tema, responsividade e áreas visuais de gestão em evolução |

A aplicação usa contas de demonstração com agência e número próprios. Para explorar o produto, o login demonstrativo é `User / 1234`. O seletor de perfil modifica apenas a apresentação; não altera privilégios de acesso à API.

## Stack técnica

- **Frontend:** Angular 19, TypeScript, SCSS, Signals, RxJS, Reactive Forms, lazy loading e Jasmine/Karma.
- **Publicação frontend:** Netlify, SPA estática com regras de redirecionamento para rotas internas e health check.
- **Backend:** Java 25, Spring Boot 4.1.1, Spring Security, Spring Data JPA, Spring Modulith, Actuator e OpenAPI.
- **Persistência:** PostgreSQL 18 no Neon, Hibernate e migrações Flyway V1–V5.
- **Testes/CI:** GitHub Actions para Angular e Java; integração com PostgreSQL de teste via Testcontainers.
- **Disponibilidade:** a API usa hospedagem sob demanda na Blitz; inicializações a frio podem causar espera antes do login.

## Organização

```text
monavero/
├── frontend/             # Interface Angular, formulários, serviços e testes
├── backend/              # API REST, regras de negócio, migrações e testes
├── docs/                 # Arquitetura, decisões, escopo e procedimentos
├── .github/workflows/    # Pipelines de frontend e backend
└── netlify.toml          # Publicação estática no Netlify
```

## Desenvolvimento local

Pré-requisitos: Node.js 22 para o frontend; Java 25, Maven 3.9+ e PostgreSQL para a API.

```bash
cd frontend
npm install
npm run dev
```

```bash
cd backend
mvn clean verify
mvn spring-boot:run
```

Configuração privada do banco: `MONAVERO_DB_JDBC_URL`, `MONAVERO_DB_USERNAME` e `MONAVERO_DB_PASSWORD`. Não versionar segredos. `mvn clean verify` executa testes integrados com banco isolado via Testcontainers, quando Docker está disponível.

```bash
cd frontend
npm run typecheck
npm run build
npm test
```

## Documentação

- [Funcionalidades](docs/FUNCIONALIDADES.md): escopo implementado e limitações.
- [Arquitetura](docs/ARQUITETURA.md): componentes, dependências e fluxos.
- [Segurança e autenticação](docs/SEGURANCA_AUTENTICACAO.md): controle de acesso e sessões.
- [Persistência](docs/PERSISTENCIA.md): esquema e migrações.
- [Testes](docs/TESTES.md): testes automatizados e critérios de aprovação.
- [Deploy frontend](docs/DEPLOY_NETLIFY.md) e [deploy backend](docs/DEPLOY_BACKEND.md).
- [Roadmap](docs/ROADMAP.md): entregas planejadas e estado de validação.

**Status:** autenticação, contas, extrato e transferências internas implementados. O roadmap diferencia código entregue de funcionalidade validada por CI e em produção.

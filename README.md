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
| Contas | Contas e saldos por titular, com crédito de abertura fictício e único para contas pessoais, persistidos no PostgreSQL |
| Dashboard | Visão consolidada de contas e movimentações; cartões e investimentos apresentados como dados ilustrativos |
| Extrato | Lançamentos persistentes, pesquisa e filtros |
| Transferências | Operações imediatas e agendadas entre contas Monavero, inclusive titulares distintos; débito/crédito atômicos, cancelamento antes da execução e idempotência |
| Pagamentos | Fluxo demonstrativo no frontend; persistência e processamento serão implementados em etapa posterior |
| Outros | Notificações, perfil, tema, responsividade e áreas visuais de gestão em evolução |

Contas pessoais recebem R$ 1.000,00 de crédito fictício de abertura uma única vez, inclusive contas antigas sem movimentações. Não existe endpoint de recarga ou depósito. A aplicação usa contas de demonstração com agência e número próprios. Para explorar o produto, o login demonstrativo é `User / 1234`. O seletor de perfil modifica apenas a apresentação; não altera privilégios de acesso à API.

Agendamentos são processados pelo backend na data solicitada, sujeitos à disponibilidade do serviço; não há reserva antecipada do saldo. Quando a hospedagem gratuita está em repouso, agendamentos vencidos são processados na próxima ativação.

## Stack técnica

- **Frontend:** Angular 19, TypeScript, SCSS, Signals, RxJS, Reactive Forms, lazy loading e Jasmine/Karma.
- **Publicação frontend:** Netlify, SPA estática com regras de redirecionamento para rotas internas e health check.
- **Backend:** Java 25, Spring Boot 4.1.1, Spring Security, Spring Data JPA, Spring Modulith, Actuator e OpenAPI.
- **Persistência:** PostgreSQL 18 no Neon, Hibernate e migrações Flyway V1–V7.
- **Testes/CI:** GitHub Actions para Angular e Java; integração com PostgreSQL de teste via Testcontainers.
- **Disponibilidade:** a API usa hospedagem sob demanda na Blitz; inicializações a frio podem causar espera antes do login.

## Integrações externas

A aplicação não utiliza serviços públicos de dados fictícios para contas, autenticação ou extrato. Os fluxos do produto utilizam exclusivamente a API Monavero. A árvore Angular histórica em `src/` tem apenas pontos de compatibilidade com os serviços atuais; a aplicação distribuída está em `frontend/`.

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


### Interface e confiabilidade
- Navegação Angular com uma tentativa controlada de atualização automática quando um deploy substitui os chunks lazy; sem loop de recarga.
- Notificações somente originadas de ações desta sessão, sem alertas aleatórios ou fixtures precárias.
- Pagamentos aguardam backend persistente; nenhum agendamento de pagamento fictício é apresentado como executável.
- Demonstração bancária conserva histórico ilustrativo de abertura, mas não inventa cartões e investimentos no frontend.
- Contrapartes das transferências identificadas inclusive no modo demonstração; detalhes da conta de terceiro permanecem mascarados.

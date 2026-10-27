# Monavero

**Monavero** é uma aplicação web de banco digital demonstrativo. A experiência de frontend é construída com **Angular 19 e TypeScript**, enquanto o repositório está preparado para receber uma **API Java com Spring Boot**. O projeto explora a evolução de uma interface financeira funcional para um sistema full stack com autenticação própria, dados persistidos, consistência transacional e auditoria.

[**Frontend · Angular**](frontend/README.md) · [**Backend · Java (planejado)**](backend/README.md) · [Arquitetura](docs/ARQUITETURA.md) · [Roadmap](docs/ROADMAP.md) · [Testes](docs/TESTES.md)

[![Frontend Angular CI](https://img.shields.io/github/actions/workflow/status/fidelmrodriguez/monavero/frontend-ci.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=Frontend%20CI)](https://github.com/fidelmrodriguez/monavero/actions/workflows/frontend-ci.yml)

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
| Automação frontend | GitHub Actions (verificação de TypeScript, build e testes; execução a validar) |
| Publicação frontend | Netlify, com build a partir de `frontend/` |
| Backend planejado | Java, Spring Boot, Spring Security e Spring Modulith |
| Persistência planejada | PostgreSQL, Spring Data JPA e Flyway |

## Arquitetura e estrutura

```text
monavero/
├── .github/workflows/       # Integração contínua do frontend
├── frontend/                # Angular, SSR, testes e recursos públicos
│   ├── src/app/
│   │   ├── core/            # Modelos, serviços, estado, guards e interceptors
│   │   ├── features/        # Telas do produto
│   │   ├── layout/          # Estrutura de navegação
│   │   └── shared/          # Componentes reutilizáveis
│   ├── public/
│   ├── package.json
│   └── README.md
├── backend/                 # README e futura API Java
├── docs/                    # Arquitetura, funcionalidades, testes e planejamento
├── netlify.toml             # Configuração do deploy Angular
└── README.md
```

**Estado atual:** o Angular funciona de maneira independente. Não existe ainda uma API Java, integração com PostgreSQL ou transferência financeira entre contas no backend. A separação entre camadas já está organizada, e a migração ocorrerá de forma incremental conforme o [roadmap](docs/ROADMAP.md).

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

## Documentação

- [Frontend Angular](frontend/README.md): telas, arquitetura, estado, testes e execução da interface.
- [Backend Java](backend/README.md): responsabilidades previstas, delimitação de módulos e requisitos de segurança e persistência.
- [Arquitetura](docs/ARQUITETURA.md): fluxo atual da aplicação e evolução para Angular + Java + PostgreSQL.
- [Funcionalidades](docs/FUNCIONALIDADES.md): escopo demonstrativo implementado.
- [Testes e CI](docs/TESTES.md): comandos, workflow e critérios de verificação.
- [Deploy no Netlify](docs/DEPLOY_NETLIFY.md): publicação do Angular SSR.
- [Roadmap](docs/ROADMAP.md): etapas 0 a 12 e critérios de conclusão.
- [Evolução técnica](docs/EVOLUCAO.md): estratégia de integração gradual com backend.

## Evolução

O objetivo é implementar gradualmente cadastro, autorização, contas, extrato persistido, transferências internas atômicas, agendamentos, administração e auditoria. Tudo continuará sendo **simulação bancária**, sem integração com instituições financeiras, Pix real ou cobrança efetiva de boletos.

A Etapa 1 está em validação de CI e publicação. A Etapa 2 iniciará a API Java sem interromper o frontend demonstrativo. Veja o [roadmap](docs/ROADMAP.md) para acompanhar o progresso e distinguir entregas planejadas das verificadas.

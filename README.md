# Monavero

Monavero é uma aplicação demonstrativa de banco digital com frontend desenvolvido em **Angular 19**, **TypeScript** e **Angular SSR**. O projeto reúne navegação por perfil, dashboard financeiro, extrato, formulários de transferência e pagamento, notificações e áreas de gestão. A evolução prevista é integrar essas experiências a uma API Java/Spring Boot própria.

> **Projeto demonstrativo.** Não é uma instituição financeira ou serviço de pagamentos. Os saldos, cartões, investimentos e movimentações são fictícios. A autenticação atual utiliza a API pública DummyJSON. Não utilize senhas ou dados bancários reais.

## Funcionalidades disponíveis

- **Autenticação demonstrativa:** acesso com credenciais de teste, sessão no navegador e seleção local de perfil (`cliente`, `gerente`, `admin`). As permissões ainda não são verificadas por um backend bancário.
- **Dashboard:** contas, investimentos, cartões, gráfico de fluxo financeiro, categorias de despesas e movimentações recentes.
- **Extrato:** listagem, filtros de período, tipo, status e valores e totalizadores.
- **Transferências:** formulário com validação de dados, limite e saldo; produz notificações fictícias, **sem transferência efetiva de recursos**.
- **Pagamentos:** agendamentos simulados mantidos apenas na memória da aplicação.
- **Notificações e auditoria:** eventos de interface e registros demonstrativos durante a sessão.
- **Experiência:** interface responsiva, componentes standalone, lazy loading, tema claro/escuro e formulários reativos.

## Tecnologias

| Área | Tecnologia |
| --- | --- |
| Frontend | Angular 19, TypeScript, SCSS, Signals, RxJS, Reactive Forms |
| Renderização | Angular SSR, hidratação e event replay |
| Navegação | Angular Router, guards e resolver |
| API temporária | DummyJSON, via HttpClient |
| Testes | Jasmine e Karma |
| CI | GitHub Actions (build e testes frontend) |
| Hospedagem do frontend | Netlify, Angular Runtime |
| Backend previsto | Java, Spring Boot, Spring Security, PostgreSQL e Flyway |

## Estrutura do repositório

```text
monavero/
├── .github/workflows/       Verificações automáticas do frontend
├── frontend/               Aplicação Angular, SSR e testes
│   ├── public/
│   ├── src/app/
│   │   ├── core/           Serviços, estado, modelos e guards
│   │   ├── features/       Páginas por funcionalidade
│   │   ├── layout/         Navegação e estrutura principal
│   │   └── shared/         Componentes reutilizáveis
│   ├── angular.json
│   ├── package.json
│   └── server.ts
├── backend/                Planejamento da API Java (implementação na Etapa 2)
├── docs/                   Arquitetura, operação, testes e roadmap
├── netlify.toml            Configuração da publicação do Angular
└── README.md
```

## Executar o frontend

Use Node.js 22 (indicado em `frontend/.nvmrc`) e npm:

```bash
cd frontend
npm install
npm run dev
```

A aplicação abre em `http://localhost:4200`.

Acesso demonstrativo:

```text
Usuário: User
Senha: 1234
Perfil: Cliente, Gerente ou Admin
```

As credenciais `User` e `1234` são convertidas internamente para uma conta de teste pública da DummyJSON. A escolha do perfil ocorre exclusivamente no frontend.

## Build e testes

Execute a partir de `frontend/`:

```bash
npm run build      # Compilação da aplicação e SSR
npm test           # Testes unitários em Chrome Headless
npm run serve:ssr  # Executa a saída SSR após o build
```

O build produz `frontend/dist/monavero/browser` e `frontend/dist/monavero/server`. A configuração de implantação está na raiz, em `netlify.toml`, com base `frontend`.

**Dependências:** o commit inicial não incluía `package-lock.json`. Por isso, neste estágio, a instalação usa `npm install`. O lockfile deverá ser gerado com npm em um ambiente com acesso ao registro e versionado; a partir disso poderemos adotar `npm ci` no CI e na publicação.

## Documentação

- [Arquitetura do frontend](docs/ARQUITETURA.md)
- [Funcionalidades e limitações](docs/FUNCIONALIDADES.md)
- [Deploy do Netlify](docs/DEPLOY_NETLIFY.md)
- [Testes e CI](docs/TESTES.md)
- [Roadmap](docs/ROADMAP.md)
- [Evolução técnica](docs/EVOLUCAO.md)

## Situação do projeto

A aplicação Angular está disponível como base demonstrativa. A **Etapa 1** organiza o monorepositório, inclui integração contínua e fortalece validações da interface. O backend Java ainda não foi implementado e começará na **Etapa 2**.

A confirmação de build, testes e deploy depende das respectivas execuções no GitHub Actions e no Netlify. Os dados financeiros ainda não possuem persistência; regras financeiras e autorização serão responsabilidade do backend nas próximas etapas.

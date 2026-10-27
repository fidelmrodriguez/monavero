# Frontend · Monavero

Interface demonstrativa de banco digital desenvolvida com **Angular 19, TypeScript e SCSS**. Reúne dashboard, extrato, formulários financeiros, notificações, administração e navegação responsiva. O frontend funciona independentemente de uma API própria: o login utiliza temporariamente a DummyJSON, e as informações financeiras são **fictícias**.

[Visão geral do Monavero](../README.md) · [Backend Java (planejado)](../backend/README.md) · [Arquitetura](../docs/ARQUITETURA.md) · [Funcionalidades](../docs/FUNCIONALIDADES.md) · [Deploy](../docs/DEPLOY_NETLIFY.md)

## Interface e experiência

- **Acesso:** formulário de usuário, senha e perfil de demonstração; logout e recuperação da sessão no navegador.
- **Dashboard:** saldos de contas, investimentos, cartões, movimentações recentes, gráficos de fluxo e categorias de despesa.
- **Extrato:** busca textual e filtros por data, natureza, situação e intervalo de valores.
- **Transferências:** formulário reativo com validação de campos, limites e saldo; confirmação apenas simulada, sem movimentar valores.
- **Pagamentos:** cadastro de agendamentos em memória, sem processamento bancário ou armazenamento no servidor.
- **Notificações e auditoria:** feedback das ações do usuário e registro local de eventos de demonstração.
- **Administração e perfis:** áreas visuais para cliente, gerente e administrador. A restrição de rotas é feita no Angular e não equivale à autorização do backend.
- **Responsividade:** navegação lateral e menu adaptáveis, tema claro/escuro, estados vazios e carregamento de páginas sob demanda.

## Tecnologias e responsabilidades

| Tecnologia | Responsabilidade |
| --- | --- |
| Angular 19 + standalone | Componentes, templates e páginas carregadas por rota |
| TypeScript + SCSS | Tipagem de dados e estilos da interface |
| Signals + `computed()` | Estado de sessão, tema, notificações e dados derivados |
| RxJS + HttpClient | Consumo da DummyJSON e tratamento de requisições |
| Reactive Forms | Formulários de login, transferências e pagamentos |
| Angular Router | Guards, resolver do dashboard, redirecionamentos e lazy loading |
| Angular SSR | Renderização no servidor, hidratação e event replay |
| Jasmine + Karma | Testes unitários em Chrome Headless |

## Organização do código

```text
frontend/
├── public/                   # Favicon e recursos estáticos
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── guards/       # Proteção demonstrativa de rotas
│   │   │   ├── interceptors/ # Requisições HTTP
│   │   │   ├── models/       # Contratos da interface
│   │   │   ├── resolvers/    # Dados iniciais do dashboard
│   │   │   ├── services/     # Autenticação externa e dados simulados
│   │   │   ├── state/        # Sessão, notificações, tema e auditoria
│   │   │   └── utils/        # Formatação e utilitários
│   │   ├── features/         # Login, dashboard, extrato, transferências,
│   │   │                     # pagamentos, notificações, auditoria,
│   │   │                     # administração e perfil
│   │   ├── layout/           # Shell, sidebar e navegação
│   │   └── shared/           # Componentes reutilizáveis
│   ├── main.ts
│   ├── main.server.ts
│   └── styles.scss
├── angular.json
├── karma.conf.js
├── package.json
├── server.ts                 # Integração SSR com o Netlify
└── README.md
```

As rotas ficam em `src/app/app.routes.ts`. A configuração de serviços, hidratação e interceptors está em `src/app/app.config.ts`. A renderização de servidor é preparada em `src/app/app.config.server.ts` e `server.ts`.

## Integração temporária e estado

`AuthApiService` executa autenticação de teste em `https://dummyjson.com/auth/login`. As credenciais inicialmente exibidas (`User` e `1234`) são convertidas para uma conta pública da API; são dados de acesso **de demonstração**, não credenciais bancárias. A sessão é salva pelo `AuthStore` em `localStorage` (`monavero-session`).

`BankingService` consulta recursos públicos da DummyJSON (`/users`, `/products` e `/carts`) e monta visualizações financeiras simuladas. Quando a API não responde, o serviço pode usar dados fictícios locais. Transferências não criam movimentações; agendamentos de pagamento desaparecem após reiniciar a aplicação.

A seleção de perfil `cliente`, `gerente` ou `admin` ocorre no navegador, e os guards conferem apenas esse estado local. Não utilize o ambiente para senhas pessoais ou informações financeiras reais.

## Executar e validar

Pré-requisito: Node.js 22 (`.nvmrc`), npm e conexão com o registro do npm para instalar as dependências.

```bash
cd frontend
npm install
npm run dev
```

A interface de desenvolvimento estará em `http://localhost:4200`.

```bash
npm run typecheck   # Verificação TypeScript
npm run build       # Build Angular com saída browser + server
npm test            # Testes Jasmine/Karma; requer Chrome/Chromium
npm run serve:ssr   # Servidor SSR local após o build
```

O build gera `dist/monavero/browser` e `dist/monavero/server` dentro de `frontend/`. O [workflow de CI](../.github/workflows/frontend-ci.yml) prepara Node.js e Chrome para executar essas verificações. O `package-lock.json` ainda não foi versionado; até sua geração, a instalação usa `npm install` em vez de `npm ci`.

## Publicação

O Angular é publicado separadamente pelo Netlify. A configuração está em [`../netlify.toml`](../netlify.toml), com `base = "frontend"`, comando `npm run build` e saída `dist/monavero/browser`. A integração SSR usa `@netlify/angular-runtime`; rotas internas precisam ser testadas após o deploy, especialmente ao atualizar a página diretamente.

A API Java será construída em `backend/`. Quando existir, os serviços do Angular migrarão de dados demonstrativos para contratos próprios, mantendo as telas e as validações de experiência. A autenticação e autorização verdadeiras ficarão exclusivamente a cargo do servidor.

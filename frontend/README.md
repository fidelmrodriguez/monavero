# Frontend · Monavero

Interface demonstrativa de banco digital desenvolvida com **Angular 19, TypeScript e SCSS**. Reúne dashboard, extrato, formulários financeiros, notificações, administração e navegação responsiva. A autenticação foi integrada ao backend Java, enquanto as informações financeiras continuam **fictícias**, com dados de apresentação fornecidos pela DummyJSON e fallback local.

[Visão geral do Monavero](../README.md) · [Backend Java](../backend/README.md) · [Arquitetura](../docs/ARQUITETURA.md) · [Funcionalidades](../docs/FUNCIONALIDADES.md) · [Deploy](../docs/DEPLOY_NETLIFY.md)

## Interface e experiência

- **Acesso:** formulário com acesso demonstrativo editável, cadastro pessoal, login e logout reais no Java, sessão validada no servidor ao navegar.
- **Dashboard:** saldos de contas, investimentos, cartões, movimentações recentes, gráficos de fluxo e categorias de despesa.
- **Extrato:** busca textual e filtros por data, natureza, situação e intervalo de valores.
- **Transferências:** formulário reativo com validação de campos, limites e saldo; confirmação apenas simulada, sem movimentar valores.
- **Pagamentos:** cadastro de agendamentos em memória, sem processamento bancário ou armazenamento no servidor.
- **Notificações e auditoria:** feedback das ações do usuário e registro local de eventos de demonstração.
- **Administração e perfis:** áreas visuais de cliente, gerente e administrador para avaliação técnica. Com `User` / `1234`, o seletor do login escolhe a **visualização de demonstração** (inclusive auditoria/administração). O backend continua atribuindo `CLIENT` à conta demo; nenhum privilégio de API pode ser concedido pelo seletor. Para contas pessoais, sempre vale o perfil recebido do Java.
- **Responsividade:** navegação lateral e menu adaptáveis, tema claro/escuro, estados vazios e carregamento de páginas sob demanda.

## Tecnologias e responsabilidades

| Tecnologia | Responsabilidade |
| --- | --- |
| Angular 19 + standalone | Componentes, templates e páginas carregadas por rota |
| TypeScript + SCSS | Tipagem de dados e estilos da interface |
| Signals + `computed()` | Estado de sessão, tema, notificações e dados derivados |
| RxJS + HttpClient | Consumo da API Java para login e DummyJSON apenas para dados financeiros fictícios |
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
│   │   │   ├── guards/       # Guards com validação da sessão na API
│   │   │   ├── interceptors/ # Requisições HTTP
│   │   │   ├── models/       # Contratos da interface
│   │   │   ├── resolvers/    # Dados iniciais do dashboard
│   │   │   ├── services/     # Auth Java e dados financeiros simulados
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

## Autenticação e dados de demonstração

`AuthApiService` usa a API Java publicada na Blitz: `POST /api/v1/auth/demo`, `/register`, `/login`, `/logout` e `GET /me`. O endereço público fica em `src/app/core/config/monavero-api.ts`. O formulário inicia com o atalho **User / 1234**, mas os campos são editáveis. O cadastro pessoal exige nome, e-mail e senha de pelo menos 12 caracteres, com login automático após a criação da conta.

No login demonstrativo, escolha Cliente, Gerente ou Administrador usando sempre **User / 1234**. A escolha define apenas quais telas fictícias do portfólio serão exibidas. O servidor atribui `CLIENT` ao demo e ao cadastro, independentemente do seletor; nenhuma chamada protegida ganha poderes de gerente/admin por essa opção. `AuthStore` guarda um token opaco em **sessionStorage**, válido por até 12 horas, valida a sessão pelo endpoint `/me` e solicita revogação no logout. Abas abertas na mesma origem sincronizam login, sessão e logout por **BroadcastChannel**: uma nova aba solicita a sessão à aba autenticada, sem salvar o token em `localStorage`. O Router aguarda brevemente essa sincronização antes de decidir o redirecionamento. Sem outra aba autenticada em execução (ou sem suporte a BroadcastChannel), a nova aba solicita login normalmente. A sessão não usa cookies de terceiros, pois Netlify e Blitz estão em domínios diferentes. Armazenamento no navegador continua exigindo proteção contra XSS; veja `docs/SEGURANCA_AUTENTICACAO.md`.

Os dados financeiros de dashboard, cartões, extratos e investimentos continuam **simulados e iguais para todos os perfis**, pois `BankingService` ainda consulta a DummyJSON (`/users`, `/products`, `/carts`) e possui fallback local. Isto não representa a conta bancária real do usuário cadastrado: a integração de titularidade/contas virá na Etapa 5. Transferências e pagamentos não movimentam dinheiro.

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

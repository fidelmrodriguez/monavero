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
- **Carregamento e despertar:** a tela inicial exibe um indicador antes do bootstrap Angular; depois, consulta `/api/monavero-readiness` pela mesma origem Netlify. O proxy encaminha a requisição para `/actuator/health` da Blitz. Só libera a aplicação com JSON `status: UP`; ignora 503, HTML de cold start e respostas inválidas. Consulta a cada 5 segundos com limite de 12 segundos por tentativa. Os guards aguardam o servidor antes de validar a sessão; login e cadastro mostram progresso e bloqueiam envios duplicados. A consulta é anônima e não envia credenciais nem tokens.

## Tecnologias e responsabilidades

| Tecnologia | Responsabilidade |
| --- | --- |
| Angular 19 + standalone | Componentes, templates e páginas carregadas por rota |
| TypeScript + SCSS | Tipagem de dados e estilos da interface |
| Signals + `computed()` | Estado de sessão, tema, notificações e dados derivados |
| RxJS + HttpClient | Consumo da API Java para login e DummyJSON apenas para dados financeiros fictícios |
| Reactive Forms | Formulários de login, transferências e pagamentos |
| Angular Router | Guards, resolver do dashboard, redirecionamentos e lazy loading |
| Angular SPA (CSR) | Renderização no navegador, preservando o roteamento Angular e o proxy Netlify |
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
├── server.ts                 # Código legado de SSR, não incluído no build SPA
└── README.md
```

As rotas ficam em `src/app/app.routes.ts`. A configuração dos serviços e interceptors está em `src/app/app.config.ts`. O build publicado é SPA, sem servidor SSR; os arquivos antigos de servidor não fazem parte da saída de produção.

## Autenticação e dados de demonstração

`AuthApiService` usa a API Java publicada na Blitz: `POST /api/v1/auth/demo`, `/register`, `/login`, `/logout` e `GET /me`. O endereço público fica em `src/app/core/config/monavero-api.ts`. O formulário inicia com o atalho **User / 1234**, mas os campos são editáveis. **Contas criadas entram exclusivamente com o e-mail usado no cadastro e a senha pessoal**, não com o nome completo e nem com a senha `1234` da demonstração. O frontend valida o identificador antes de chamar `/login`, limpa a senha `1234` ao trocar para um e-mail pessoal e exibe orientação em caso de credenciais rejeitadas, sem registrar senhas ou tokens. O cadastro pessoal exige nome, e-mail e senha de pelo menos 12 caracteres, com login automático após a criação da conta.

No seletor do topo do login demonstrativo, escolha Cliente, Gerente ou Administrador usando sempre **User / 1234**. A escolha define apenas quais telas fictícias do portfólio serão exibidas. O servidor atribui `CLIENT` ao demo e ao cadastro, independentemente do seletor; nenhuma chamada protegida ganha poderes de gerente/admin por essa opção. `AuthStore` guarda um token opaco em **sessionStorage**, válido por até 12 horas, valida a sessão pelo endpoint `/me` e solicita revogação no logout. Abas abertas na mesma origem sincronizam login, sessão e logout por **BroadcastChannel**: uma nova aba solicita a sessão à aba autenticada, sem salvar o token em `localStorage`. O Router aguarda brevemente essa sincronização antes de decidir o redirecionamento. Sem outra aba autenticada em execução (ou sem suporte a BroadcastChannel), a nova aba solicita login normalmente. A sessão não usa cookies de terceiros, pois Netlify e Blitz estão em domínios diferentes. Armazenamento no navegador continua exigindo proteção contra XSS; veja `docs/SEGURANCA_AUTENTICACAO.md`.

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
npm run build       # Build Angular SPA estática
npm test            # Testes Jasmine/Karma; requer Chrome/Chromium
npm run serve:ssr   # Comando legado; não utilizado no deploy SPA
```

O build gera `dist/monavero/browser` dentro de `frontend/`, sem `dist/monavero/server`. O [workflow de CI](../.github/workflows/frontend-ci.yml) prepara Node.js e Chrome para executar essas verificações. O `package-lock.json` ainda não foi versionado; até sua geração, a instalação usa `npm install` em vez de `npm ci`.

## Publicação

O Angular é publicado separadamente pelo Netlify. A configuração está em [`../netlify.toml`](../netlify.toml), com `base = "frontend"`, comando `npm run build` e saída `dist/monavero/browser`. O frontend usa SPA estática: a regra `/api/monavero-readiness` em `public/_redirects` deve operar antes do fallback `/*`, sem Edge Function SSR interceptando a rota. O `@netlify/angular-runtime` continua listado como dependência, mas o build não publica servidor SSR. Teste `/api/monavero-readiness` após o deploy: deve retornar JSON do health check ou erro HTTP da Blitz, nunca o HTML do Angular.

A API Java será construída em `backend/`. Quando existir, os serviços do Angular migrarão de dados demonstrativos para contratos próprios, mantendo as telas e as validações de experiência. A autenticação e autorização verdadeiras ficarão exclusivamente a cargo do servidor.


## Etapa 5: dados financeiros por sessão

- Dashboard e extrato consomem `GET /api/v1/banking/overview`, com autorização Bearer e persistência PostgreSQL no backend.
- Não são utilizadas respostas da DummyJSON para saldos ou transações. Contas pessoais começam vazias; apenas o usuário demo vê produtos de investimento/cartão fictícios como referência visual.
- Falhas temporárias 502/503/504 ou de rede da Blitz acionam o despertar da API e repetição limitada, sem repetir credenciais incorretas (401).
- O indicador de autenticação permanece na tela até a navegação concluir, sem reaparecer o formulário entre o login e o dashboard.

### Etapa 6 — transferências internas

A página **Transferências** consulta contas reais da API, valida dados no formulário e executa `POST /api/v1/banking/transfers`. O spinner permanece durante a confirmação. Sucesso só é exibido após retorno da API e o saldo é recarregado. Se a conexão com a Blitz cair, a mesma chave de idempotência pode ser reutilizada sem duplicar o débito. A conta demo oferece um botão para preencher a segunda conta fictícia de destino. Agendamentos ainda não são implementados.

## Despertar da API na Blitz via proxy Netlify

O `ApiReadinessService` verifica `GET /api/monavero-readiness` na **mesma origem** do frontend, sem autenticação.
A primeira regra de `frontend/public/_redirects` faz proxy HTTP 200! para
`https://monavero-api.fidelmrodriguez.blitz.cloud/actuator/health`, como no Orquestria.
Isso evita o bloqueio de CORS quando a Blitz responde 503 durante o despertar.
O aplicativo **só** libera a navegação ao receber JSON com `status: "UP"`, e ignora HTML da Blitz,
respostas 503, JSON inválido e outros estados. Repete a tentativa a cada 5 segundos.
A última regra do `_redirects` mantém as rotas Angular funcionando no F5.

Em `npm run dev`, `frontend/proxy.conf.json` encaminha o mesmo caminho para o
health da Blitz pelo proxy de desenvolvimento Angular. Não enviar tokens nem senhas
para a rota de readiness. Em produção, confirme em
`https://monavero.netlify.app/api/monavero-readiness` que o resultado, após
o servidor acordar, seja JSON com `status: "UP"` (não HTML do Angular).

## Hotfix: o Angular SSR interceptava a rota de readiness

Com SSR habilitado, a Edge Function criada pelo runtime Angular no Netlify pode
responder à URL `/api/monavero-readiness` antes de avaliar o proxy `_redirects`,
retornando HTML da SPA em vez do JSON do Spring Boot. O `angular.json` agora
produz uma **SPA estática** (`outputMode: static`), sem bundle SSR.
O CI confere a existência de `dist/monavero/browser/_redirects` e a ausência
do bundle `dist/monavero/server`. O proxy Netlify já existente mantém o endereço
de saúde na mesma origem e libera o aplicativo somente com `status: UP`.
Um proxy corretamente configurado **não garante**, por si só, que a plataforma
de hospedagem permita despertar aplicações em suspensão; isso deve ser validado
no deploy real.

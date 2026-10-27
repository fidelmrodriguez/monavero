# Arquitetura do frontend

O Monavero utiliza Angular 19 com componentes standalone, navegação por rotas e renderização no servidor (SSR). A aplicação é organizada por domínio de interface, mantendo a infraestrutura compartilhada separada das páginas.

## Estrutura das responsabilidades

| Local | Responsabilidade |
| --- | --- |
| `src/app/core/models/` | Tipos da sessão, contas, transações, investimentos e pagamentos. |
| `src/app/core/services/auth-api.service.ts` | Integração do login demonstrativo com a DummyJSON. |
| `src/app/core/services/banking.service.ts` | Consulta e adaptação de dados externos para o modelo visual, fallback e agendamentos em memória. |
| `src/app/core/state/` | Signals e estado dos fluxos de autenticação, notificações, tema e auditoria local. |
| `src/app/core/interceptors/` | Cabeçalho de autorização para requisições destinadas à DummyJSON e tratamento de erros HTTP. |
| `src/app/core/guards/` | Redirecionamento de login e restrições de navegação por sessão e perfil demonstrativo. |
| `src/app/core/resolvers/` | Carregamento do panorama financeiro antes de abrir o dashboard. |
| `src/app/features/` | Páginas isoladas por função, carregadas sob demanda. |
| `src/app/layout/` | Navegação lateral, topbar, menu mobile e estrutura de páginas autenticadas. |
| `src/app/shared/` | Elementos reutilizáveis, incluindo gráficos financeiros SVG e estados vazios. |

## Fluxo de autenticação

1. O formulário apresenta as credenciais `User` / `1234`, que podem ser editadas.
2. `AuthApiService` converte esse par de demonstração para uma conta pública de teste e executa `POST /auth/login` na DummyJSON.
3. `AuthStore` guarda os dados da sessão no navegador sob a chave `monavero-session`.
4. Os guards controlam a navegação. O perfil (`cliente`, `gerente`, `admin`) é escolhido na tela e não é atestado pela API externa.
5. O logout remove a sessão local e redireciona para o login.

Esse fluxo não representa controle de acesso bancário confiável. Em um backend real, o servidor deverá ser a autoridade de identidade, permissões e expiração de sessão.

## Dados financeiros

O `BankingService` consulta recursos públicos `/users`, `/products` e `/carts` da DummyJSON e converte os resultados em contas, investimentos, cartões, extrato e gráficos de demonstração. Os saldos e parte dos indicadores são valores definidos no serviço, e não informações financeiras fornecidas pela API.

O dashboard recebe seu `DashboardOverview` pelo resolver. Outras telas consomem o mesmo serviço. Um fallback local é usado caso a consulta externa falhe, de modo que a interface possa continuar exibindo dados fictícios. A lista de agendamentos permanece em memória e é reiniciada ao recarregar a aplicação.

As transferências são validadas e geram feedback e eventos locais; **não alteram saldos, não criam lançamentos persistentes e não transferem recursos**.

## Estado e renderização

- Signals e `computed()` sustentam estado de interface e exibição de elementos dependentes da sessão.
- RxJS compõe chamadas HTTP, trata erros e integra fluxos assíncronos.
- Os formulários reativos validam campos antes das ações simuladas.
- A renderização SSR é configurada em `app.config.server.ts`, `main.server.ts` e `server.ts`.
- Sessão e tema são acessados apenas em contexto de navegador, evitando o uso direto de `localStorage` durante SSR.
- `src/app/app.config.ts` habilita hidratação, event replay, HttpClient com `fetch` e o locale `pt-BR`.

## Segurança e cuidados

O código atual é um protótipo funcional de interface. Há tokens mantidos em `localStorage`, permissões de rota avaliadas no cliente, eventos de auditoria em memória e notificações artificiais. Esses comportamentos precisam ser substituídos ou redesenhados antes de qualquer uso com usuários ou informações financeiras reais.

Não inserir segredos, senhas de produção, chaves privadas ou dados pessoais reais no código, no console ou no repositório.

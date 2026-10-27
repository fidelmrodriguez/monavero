# Monavero

Interface de banco digital desenvolvida em **Angular 19**, **TypeScript** e **Angular SSR**, com painel financeiro, gerenciamento de contas demonstrativas, extrato, transferências, agendamento de pagamentos, notificações e áreas de gestão por perfil.

O Monavero reúne uma experiência de navegação responsiva, formulários reativos e recursos de estado do Angular em uma aplicação organizada por funcionalidades. O frontend já oferece os principais fluxos de navegação de um internet banking e está preparado para evoluir com uma API própria.

> **Ambiente de demonstração.** Não se trata de uma instituição financeira nem de um serviço de pagamentos. Os saldos, cartões, extratos, transferências, pagamentos e registros de auditoria são fictícios. A autenticação de demonstração utiliza a API pública DummyJSON; não informe credenciais bancárias reais.

## Funcionalidades

- **Acesso:** tela de login com credenciais demonstrativas preenchidas, validação de formulário, sessão no navegador e escolha de perfil para explorar a interface.
- **Dashboard:** visão de contas, saldos, investimentos, cartões, movimentações recentes e gráficos financeiros em SVG.
- **Extrato:** pesquisa, filtros por período, tipo de transação, status e intervalo de valor, com totalizadores.
- **Transferências:** formulário com validação de campos, limite por operação e saldo exibido; registro visual de solicitação, sem movimentação financeira real.
- **Pagamentos:** agendamento demonstrativo de boletos, com itens mantidos temporariamente na memória da aplicação.
- **Notificações:** alertas visuais, lista de notificações, indicação de não lidas e eventos simulados durante a sessão.
- **Gestão e auditoria:** telas acessíveis conforme o perfil demonstrativo selecionado (`cliente`, `gerente` ou `admin`), com ações e registros locais.
- **Experiência:** layout responsivo, menus adaptados ao mobile, alternância entre temas claro e escuro e estados vazios para listagens.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Interface | Angular 19, componentes standalone, TypeScript, SCSS |
| Renderização | Angular SSR, hidratação e event replay |
| Estado e formulários | Signals, RxJS, Reactive Forms |
| Navegação | Angular Router, lazy loading, guards e resolver |
| Integrações | HttpClient, interceptors e DummyJSON (demonstração) |
| Testes | Jasmine e Karma |
| Hospedagem | Netlify, com integração `@netlify/angular-runtime` |

## Iniciar o frontend

**Pré-requisitos:** Node.js 22 e npm (a versão de Node está indicada em `.nvmrc`).

```bash
# na raiz do repositório Monavero
npm install
npm run dev
```

A aplicação de desenvolvimento fica disponível em `http://localhost:4200`.

Para testar o acesso demonstrativo:

```text
Usuário: User
Senha: 1234
Perfil: Cliente, Gerente ou Admin (selecionado na tela)
```

O par `User` / `1234` é convertido internamente em credenciais públicas de teste da DummyJSON. O perfil é escolhido no frontend, portanto **não representa autorização validada por um servidor bancário**.

## Comandos

```bash
npm run dev          # servidor de desenvolvimento Angular
npm run build        # build de produção, com artefatos browser e SSR
npm run serve:ssr    # servidor SSR local após o build
npm test             # testes unitários sem modo watch
```

O build é gerado em `dist/monavero/`. A publicação no Netlify está configurada pelo `netlify.toml` e pela integração Angular da plataforma; o diretório browser é `dist/monavero/browser`.

## Organização

```text
public/                 Identidade visual e arquivos estáticos
src/
  app/
    core/               Serviços, estado, modelos, guards e interceptors
    features/           Telas agrupadas por funcionalidade
    layout/             Shell, menus e navegação
    shared/             Componentes compartilhados
  styles.scss           Tokens visuais e estilos globais
  main.ts               Entrada da aplicação no navegador
  main.server.ts        Entrada de renderização SSR
server.ts               Integração SSR com o runtime Angular do Netlify
docs/                   Referência técnica e funcional
angular.json            Configuração do projeto Angular
netlify.toml            Configuração de publicação
```

## Documentação

- [Arquitetura do frontend](docs/ARQUITETURA.md)
- [Funcionalidades e comportamento](docs/FUNCIONALIDADES.md)
- [Publicação no Netlify](docs/DEPLOY_NETLIFY.md)
- [Evolução da aplicação](docs/EVOLUCAO.md)

## Limites da versão atual

Este repositório contém **somente o frontend**. Os dados financeiros não vêm de uma API bancária; parte das informações é produzida a partir de respostas da DummyJSON, com valores e regras demonstrativas definidos no próprio código, e parte possui fallback local para indisponibilidade externa. O navegador mantém sessão e preferência de tema; agendamentos, notificações e auditoria não são persistidos em um banco de dados.

A camada de segurança atual é própria de uma demonstração de interface. O armazenamento de token no navegador e os perfis selecionáveis **não devem ser aproveitados diretamente como autenticação/autorização de produção**. A implementação de backend transacional e suas validações acontecerá em uma evolução separada.

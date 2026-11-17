# Frontend — Monavero

Interface de banco digital demonstrativo desenvolvida com **Angular 19**, TypeScript e SCSS, publicada no Netlify como **SPA estática**.

[Visão geral](../README.md) · [Backend](../backend/README.md) · [Funcionalidades](../docs/FUNCIONALIDADES.md) · [Deploy](../docs/DEPLOY_NETLIFY.md)

## Interface e navegação

- **Acesso:** login demonstrativo, cadastro pessoal, autenticação, logout e proteção de rotas.
- **Cliente:** painel financeiro com contas, saldo, entradas/saídas, ações rápidas, gráficos e extrato recente.
- **Gerente demonstrativo:** painel gerencial, indicadores reais, consulta de usuários e contas sem permissão de edição.
- **Administrador demonstrativo:** painel administrativo, gestão de acessos e histórico de auditoria.
- **Operações:** extrato, transferências imediatas e agendadas, pagamentos demonstrativos, notificações, cartões virtuais fictícios e perfil pessoal.
- **Experiência:** tema claro/escuro, layout responsivo, formulários reativos, carregamento assíncrono e mensagens de erro orientadas ao usuário.

O seletor do acesso compartilhado `User / 1234` define o **papel da sessão no backend**. Contas pessoais recebem as próprias permissões do servidor e não podem assumir papéis administrativos por mudança de rota ou estado da interface.

## Tecnologias

| Componente | Utilização |
| --- | --- |
| Angular standalone e Router | Páginas e navegação protegida |
| Signals e RxJS | Estado reativo e operações HTTP |
| Reactive Forms | Validação dos formulários |
| TypeScript e SCSS | Tipos, estilos e responsividade |
| API Java | Autenticação, operações bancárias e gestão demonstrativa |
| Jasmine e Karma | Testes automatizados |

O frontend usa `/api/monavero-readiness` na própria origem Netlify para consultar a disponibilidade do backend por proxy. Rotas internas usam fallback SPA; a API Java é hospedada na Blitz. O deploy usa `frontend/dist/monavero/browser`, sem SSR.

## Estrutura

```text
frontend/
├── public/               # Recursos e redirecionamentos Netlify
├── src/app/
│   ├── core/             # Autenticação, modelos, API e estado
│   ├── features/         # Páginas e formulários
│   ├── layout/           # Sidebar, cabeçalho e navegação
│   └── shared/           # Componentes e diretivas
└── package.json
```

## Execução e testes

Requer Node.js 22 e Chrome/Chromium para testes Karma.

```bash
cd frontend
npm install --no-audit --no-fund
npm run dev
```

```bash
npm run typecheck
npm run build
npm test
```

Veja [Testes](../docs/TESTES.md) para critérios de aceitação e verificação do site publicado.

## Limites do ambiente

O Monavero não realiza PIX, TED, pagamentos externos, emissão real de cartões ou investimentos. Cartões, boletos de exemplo e créditos de abertura são demonstrativos. Os agendamentos dependem do backend ativo; na hospedagem gratuita, o processamento pode ocorrer após a reativação da API.

Logs operacionais estruturados ficam no DevTools com categorias por domínio, sem dados bancários completos, senhas ou tokens. Os usuários visualizam apenas mensagens da aplicação, não diagnósticos internos.

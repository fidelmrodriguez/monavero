# Testes e integração contínua

## Frontend Angular

A configuração de CI fica em [`.github/workflows/frontend-ci.yml`](../.github/workflows/frontend-ci.yml). O workflow é acionado em `push` e `pull_request` na `main`, além de permitir execução manual, e prepara Node.js 22 e Chrome for Testing.

| Verificação | Comando (em `frontend/`) | Objetivo |
| --- | --- | --- |
| Tipagem TypeScript | `npm run typecheck` | Identificar erros de tipos no código Angular. |
| Build | `npm run build` | Compilar frontend, templates e artefatos SSR. |
| Testes unitários | `npm test` | Executar Jasmine/Karma em Chrome Headless. |

Em Codespaces ou ambiente local:

```bash
cd frontend
npm install
npm run typecheck
npm run build
npm test
```

Chrome/Chromium é necessário para os testes; o workflow configura o caminho do binário com `CHROME_BIN`. No Netlify, a compilação usa `npm run build` com `base = "frontend"`.

## Localização brasileira nos testes

A aplicação usa `pt-BR` para exibir datas e valores em reais. O registro dos dados de localização é centralizado em `frontend/src/locale.ts` e carregado tanto na inicialização da aplicação (browser/SSR) quanto no ambiente Jasmine/Karma por meio dos `polyfills` do alvo `test` em `frontend/angular.json`.

Esse carregamento evita o erro `NG0701: Missing locale data for the locale "pt-BR"` observado no primeiro workflow, no qual 10 dos 20 testes falharam ao renderizar `DatePipe` e `CurrencyPipe`. Os testes em `src/app/core/utils/locale.spec.ts` cobrem explicitamente as formatações de data e moeda. A aprovação completa deve ser confirmada no próximo GitHub Actions.

O layout principal também deve ser conferido no Netlify: em telas desktop, a topbar deve começar exatamente na borda direita da sidebar, sem faixa vazia; em telas menores, o menu móvel continua ocupando toda a largura.

## Dependências e reproducibilidade

O frontend ainda não possui `package-lock.json` versionado. O workflow utiliza temporariamente `npm install --no-audit --no-fund`; versões transitivas podem variar, e a execução não é totalmente reproduzível.

Quando o registro npm estiver acessível, execute `npm install` dentro de `frontend/` e commit o `frontend/package-lock.json` gerado. Em seguida, substitua `npm install` por `npm ci` no CI e, se aplicável, na configuração de build. Não crie um lockfile manualmente.

## Revisão funcional no Netlify

- Login demonstrativo com `User` / `1234`, mudança de perfil, navegação e logout.
- Atualização direta de rotas internas sem erro 404; verificar SSR e hidratação.
- Dashboard, extrato, filtros, notificações, auditoria e perfil.
- Formulários de transferências: validações de saldo, limite, origem e dados obrigatórios.
- Pagamentos demonstrativos e estados vazios.
- Layout responsivo e tema claro/escuro.

## Critério de conclusão da Etapa 1

A Etapa 1 só estará **validada** depois de o GitHub Actions executar com sucesso, o Netlify compilar com o novo diretório e os fluxos essenciais serem conferidos na aplicação publicada. A existência do workflow no repositório não comprova seu sucesso.

## Futura API Java

As etapas posteriores acrescentarão testes de domínio, autorização, PostgreSQL, concorrência, idempotência e consistência transacional, com bancos de teste isolados de ambientes de produção.

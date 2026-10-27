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

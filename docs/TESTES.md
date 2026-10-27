# Testes e integração contínua

## Frontend Angular

As verificações automatizadas estão em `.github/workflows/frontend-ci.yml`. O workflow é executado em `push` e `pull_request` para a branch `main`, com Node.js 22 e Chrome for Testing.

Executar localmente ou em Codespaces, a partir da raiz do repositório:

```bash
cd frontend
npm install
npm run build
npm test
```

Os testes unitários atuais usam Jasmine e Karma em Chrome Headless. Uma instalação de navegador compatível é necessária para `npm test` fora do GitHub Actions.

## Ausência temporária de lockfile

A base original não contém `package-lock.json`. O CI usa `npm install --no-audit --no-fund` para instalar dependências conforme o `package.json`. Isto **não garante versões transitivas reprodutíveis**.

Assim que for executado `npm install` em um Codespaces com acesso ao npm, o `frontend/package-lock.json` resultante deve ser versionado. Depois, substituir `npm install` por `npm ci` no workflow e no procedimento de build. Não criar o lockfile manualmente.

## Verificações de revisão

- Login demonstrativo e troca de perfil funcionam como antes.
- Recarregar a rota do dashboard não causa erro 404 no Netlify.
- Extrato, filtros, notificações, pagamentos e navegação mobile permanecem operantes.
- Transferências não podem ser solicitadas sem conta de origem ou com saldo insuficiente.
- Nenhum dado financeiro exibido nesta etapa é apresentado como transação real.

## Alcance

Testes automatizados do frontend não substituem a futura bateria de testes de autorização, consistência transacional, PostgreSQL e concorrência no backend Java. Essas verificações serão implementadas nas etapas correspondentes.

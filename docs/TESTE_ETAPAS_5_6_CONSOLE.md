# Monavero — Testes das etapas 5 e 6 (console)

Abra o site no navegador e pressione `F12` → **Console**. Filtre por `[Monavero][Teste`.
Os logs exibem somente estado, contagens, códigos HTTP e contas mascaradas — nunca senhas,
tokens ou e-mails. A confirmação efetiva da operação vem da **API** e dos **saldos/extrato**.

## Etapa 5 — dados persistentes

1. Faça login `User / 1234` (demonstração). Console: `[Monavero][Teste E4] Autenticação confirmada; abrindo dashboard`.
2. Abra **Dashboard**. Console: `[Monavero][Teste E5] Dashboard/contas recebidos da API` com `contas >= 2` no demo e saldos válidos.
3. Na própria dashboard procure `Ag. 0001 · Conta MV...`. Esses valores são recebidos do PostgreSQL, não inventados pelo frontend.
4. Abra **Extrato**. Console: `[Monavero][Teste E5] Extrato recebido da API` e a contagem de lançamentos.
5. Saia e entre novamente: dados devem persistir após F5/logout/login.

## Etapa 6 — transferência interna entre contas do ambiente de demonstração

1. Em **Transferências**, observe **Sua agência** e **Sua conta** abaixo do seletor de origem.
2. Na demonstração `User / 1234`, o aplicativo pré-seleciona uma segunda conta pertencente à mesma identidade. O botão **Transferir para outra conta minha** repõe esse destino quando necessário. Os dados são obtidos da API, não inventados no navegador.
3. O valor começa vazio (envio desabilitado). Digite `10` no valor. Clique em **Confirmar transferência**. Não use a mesma conta de origem como destino.
4. Console: `[Monavero][Teste E6] Enviando transferência à API`; em sucesso, `[Monavero][Teste E6] API confirmou transferência` com `status: 'concluido'` e `comprovanteRecebido: true`.
5. Depois: `[Monavero][Teste E6] Saldos consultados novamente após confirmação`. O saldo de origem deve cair R$ 10, o destino subir R$ 10, e o extrato deve ganhar lançamento de débito e crédito.
6. Atualize com F5 e confira a persistência. Teste valor acima do saldo e agência com 3 dígitos: devem ser recusados sem debitar.

## Se algo falhar

- `httpStatus: 422`: dados do destino inválidos, mesmo número de conta, saldo insuficiente ou conta inativa.
- `httpStatus: 403`: origem sem titularidade ou demo tentando transferir para fora da demonstração.
- `httpStatus: 409`: mesma chave de idempotência com dados diferentes.
- `httpStatus: 0` ou `503`: rede, CORS ou backend indisponível.
- Se não houver `API confirmou transferência`, **não** considere a operação concluída.

Copie os logs `[Monavero][Teste ...]` para a análise. Não inclua cabeçalhos Authorization, credenciais ou sessão de autenticação.

## Critério de apresentação ao público

Não exibir identificadores de etapas, instruções de teste, nomes da infraestrutura (Neon, PostgreSQL, API) ou mensagens de QA nas telas do produto. Os logs de diagnóstico ficam exclusivamente no DevTools; os roteiros de validação ficam neste documento e em `docs/TESTES.md`.

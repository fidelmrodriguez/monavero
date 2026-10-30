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

## Etapa 6 — transferência interna entre contas reais do ambiente demo

1. Em **Transferências**, observe **Sua agência** e **Sua conta** abaixo do seletor de origem.
2. Ao usar `User / 1234`, destino demo `Ag. 0001 · MV...` é preenchido automaticamente pelo backend. O botão **Usar destino demonstrativo** permite preencher novamente.
3. Digite `10` no valor. Clique em **Confirmar transferência**. Não use a mesma conta de origem como destino.
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

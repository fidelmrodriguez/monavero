# Deploy do frontend Angular no Netlify

O Netlify publica o Monavero como **Angular SPA estática**, sem SSR ou Edge Function
Angular para interceptar rotas. Autenticação e dados financeiros continuam na API
Java hospedada na Blitz, com autorização no servidor.

## Configuração versionada

O arquivo `netlify.toml` da raiz mantém:

```toml
[build]
  base = "frontend"
  command = "npm run build"
  publish = "dist/monavero/browser"

[build.environment]
  NODE_VERSION = "22"
```

O `frontend/angular.json` publica `outputMode: static` e não gera bundle SSR.
O arquivo `frontend/public/_redirects` é copiado pelo Angular para a pasta publicada.
Sua primeira regra faz proxy de `/api/monavero-readiness` para
`https://monavero-api.fidelmrodriguez.blitz.cloud/actuator/health`.
A segunda regra `/* /index.html 200` mantém refresh e links diretos nas rotas Angular.
As regras são processadas de cima para baixo; a rota da API deve vir primeiro.

## Publicação e validação

1. Confirme o **Frontend Angular CI** verde. Ele verifica que o build é estático,
   contém `_redirects` e não contém bundle de servidor Angular.
2. Publique a branch `main` no Netlify com o `netlify.toml` versionado.
3. Acesse `/api/monavero-readiness` no Netlify. Deve retornar **JSON** de health
   quando o Spring estiver ativo; se indisponível, pode retornar erro HTTP, mas
   **não** deve renderizar o HTML/visual do aplicativo Angular.
4. Com a API online, confira `status: "UP"` e o carregamento do dashboard.
5. Teste login demonstrativo, login pessoal, F5, logout, extrato e transferências.

O endpoint de readiness é anônimo e não deve transmitir tokens ou senhas.

## Diagnóstico

- Se `/api/monavero-readiness` mostrar a página Angular, verifique se o deploy
  ainda tem SSR/Edge Function interceptando a rota ou se `_redirects` não foi publicado.
- Se o proxy devolver `502`/`503`, verifique a disponibilidade da Blitz; esses
  erros não são, por si só, problemas de CORS do backend.
- Se o Java estiver online e a rota devolver JSON `UP`, mas o loading continuar,
  investigue `ApiReadinessService` no navegador.
- A existência do proxy não garante o despertar automático se a hospedagem
  bloquear acessos programáticos. Não tratar essa limitação como erro de login.

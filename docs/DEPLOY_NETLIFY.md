# Publicação do frontend no Netlify

## Configuração para o monorepositório

O arquivo `netlify.toml` permanece na raiz do GitHub e define os caminhos referentes ao diretório `frontend/`:

```toml
[build]
  base = "frontend"
  command = "npm run build"
  publish = "dist/monavero/browser"
```

- **Base directory:** `frontend`
- **Build command:** `npm run build`
- **Publish directory:** `dist/monavero/browser`, relativo a `frontend` (caminho completo no repositório: `frontend/dist/monavero/browser`).
- **Node.js:** 22, declarado em `frontend/.nvmrc`.
- **Framework:** Angular 19 com SSR; o `@netlify/angular-runtime` participa da integração de renderização.

O arquivo de configuração versionado tem precedência sobre as opções de build correspondentes na interface Netlify. Caso tenha configurado manualmente outra pasta, confira os valores após o commit de reorganização.

## Passos de validação

1. Conecte o repositório à branch `main` do site no Netlify.
2. Execute o deploy usando a configuração do repositório.
3. Confira no log que as dependências foram instaladas em `frontend/` e que a saída browser foi criada.
4. Acesse a página de login e teste as credenciais de demonstração.
5. Teste a navegação e recarregue uma rota interna; verifique o comportamento SSR e os redirects gerenciados pelo runtime.
6. Confira o site em larguras de tela pequenas e maiores e em tema claro/escuro.

Se o build falhar ou houver rota 404, consulte primeiro o log do Netlify. Não crie um redirecionamento SPA genérico para `/index.html` sem verificar sua compatibilidade com a renderização SSR existente.

## Limites

Esta publicação distribui apenas o frontend. O login continua usando DummyJSON e as demais operações financeiras são simuladas; não há configuração de API Java ou credenciais reais nesta etapa.

# Publicação no Netlify

O Monavero mantém a configuração Angular SSR da aplicação, com `@netlify/angular-runtime` como dependência de desenvolvimento e o adaptador de renderização em `server.ts`.

## Configuração do repositório

O `netlify.toml` incluído no projeto define:

```toml
[build]
  command = "npm run build"
  publish = "dist/monavero/browser"
```

A saída de build corresponde ao `outputPath` definido em `angular.json`. O arquivo `server.ts` fornece a integração com o runtime Angular do Netlify. Não é necessário adicionar um redirecionamento SPA genérico por cima da configuração SSR.

## Publicar

1. Faça o commit dos arquivos do frontend em um repositório GitHub.
2. No Netlify, crie um novo site importando esse repositório.
3. Utilize Node.js 22 (o repositório inclui `.nvmrc`).
4. Confira o comando de build `npm run build` e o diretório `dist/monavero/browser`.
5. Faça o deploy e acompanhe o log de build. O runtime Angular deve cuidar da publicação SSR quando reconhecido pela plataforma.
6. Confira diretamente as rotas `/login`, `/app/dashboard` e outras páginas depois do login e recarregue a página para validar o roteamento.

**O domínio público ainda não está definido neste repositório.** Adicione o endereço ao README após a publicação, em vez de reutilizar o URL da marca anterior.

## Teste local

```bash
npm install
npm run build
npm run serve:ssr
```

O comando `serve:ssr` executa o artefato `dist/monavero/server/server.mjs` criado pelo build. O comando de desenvolvimento segue sendo `npm run dev`.

## Validação pós-deploy

- Conferir título "Monavero" e favicon com a letra M.
- Entrar com `User` / `1234` e acessar o painel de demonstração.
- Abrir extrato, transferências, pagamentos, notificações e perfil.
- Selecionar os perfis gerente e admin em novos logins para conferir a navegação correspondente.
- Conferir tema escuro, menu mobile e recarregamento de rotas internas.
- Verificar o console e as requisições externas caso a DummyJSON esteja indisponível.

A autenticação de demonstração requer acesso à DummyJSON. O dashboard possui fallback para dados financeiros, mas a autenticação não funciona offline.

## Considerações

Este deploy publica apenas um frontend demonstrativo. Não armazene credenciais reais no projeto nem interprete os perfis selecionados no cliente como autorização de produção. Uma API Java própria, quando existir, precisará de configuração de ambiente, CORS, contratos HTTP e um modelo de autenticação independente da DummyJSON.

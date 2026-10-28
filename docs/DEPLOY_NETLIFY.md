# Deploy do frontend Angular no Netlify

O Netlify publica o frontend demonstrativo do Monavero. **A autenticação já depende da API Java hospedada na Blitz.** A renderização no servidor usa Angular SSR e `@netlify/angular-runtime`.

## Configuração versionada

O arquivo `netlify.toml` fica na raiz do repositório:

```toml
[build]
  base = "frontend"
  command = "npm run build"
  publish = "dist/monavero/browser"

[build.environment]
  NODE_VERSION = "22"
```

A base `frontend` determina onde as dependências são instaladas e o comando de build é executado; `publish` é relativo a essa base, apontando portanto para `frontend/dist/monavero/browser`. O frontend também possui `.nvmrc` com a versão principal do Node.js.

## Publicação e validação

1. Conecte o repositório Monavero à branch `main` no Netlify.
2. Confirme que a configuração adotada é a do `netlify.toml` da raiz, com base `frontend` e Node.js 22. O arquivo versionado prevalece sobre opções equivalentes da interface.
3. Inicie um deploy e revise o log de instalação e de compilação Angular/SSR.
4. Confira login demonstrativo `User`/`1234`, cadastro pessoal, logout, login posterior e demais páginas.
5. Atualize diretamente `/app/dashboard` e outras rotas internas para verificar a resposta do runtime SSR, em vez de confiar apenas na navegação client-side.
6. Teste menu mobile, responsividade e tema claro/escuro.
7. Confira o resultado do workflow em `Actions > Frontend Angular CI`; uma compilação aprovada no Netlify não substitui os testes do CI.

Não adicione um redirecionamento global para `/index.html` sem verificar seu impacto no SSR; o runtime Angular é responsável pela integração da renderização.

## Problemas comuns

- **Build executado na raiz:** verifique se `base` está sendo interpretado como `frontend` e se não há configuração conflitante de diretório de pacote no painel do Netlify.
- **Diretório publicado inexistente:** confira a saída em `frontend/dist/monavero/browser` após o build.
- **404 ao recarregar:** examine se o deploy inclui o runtime SSR e se suas rotas estão configuradas corretamente.
- **Falha de autenticação:** o login depende da API Java na Blitz e do CORS que autoriza a origem exata do Netlify. Verifique health, logs e variáveis da Blitz; DummyJSON é usada somente para os dados financeiros fictícios.

## Limites atuais

Transferências e pagamentos continuam simulados; o frontend não deve receber senhas do banco ou tokens secretos de servidor. Apenas o endereço público da API fica no TypeScript; PostgreSQL e Flyway residem no backend.

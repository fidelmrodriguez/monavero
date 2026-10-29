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

- Login demonstrativo com `User` / `1234` editáveis, cadastro pessoal, login posterior, atualização de página e logout. Verificar que não é possível selecionar privilégios de administrador pelo navegador.
- Atualização direta de rotas internas sem erro 404; verificar SSR e hidratação.
- Dashboard, extrato, filtros, notificações, auditoria e perfil.
- Formulários de transferências: validações de saldo, limite, origem e dados obrigatórios.
- Pagamentos demonstrativos e estados vazios.
- Layout responsivo e tema claro/escuro.

## Backend Java

O workflow [`.github/workflows/backend-ci.yml`](../.github/workflows/backend-ci.yml) roda em `push`, `pull_request` (quando há alterações no backend) e manualmente. Usa JDK 25 e executa `mvn -B -ntp clean verify` em `backend/`.

```bash
cd backend
mvn -B -ntp clean verify
```

### Verificação obrigatória antes da publicação na Blitz

O backend deve compilar **sem erros** no workflow `Backend Java CI` antes de considerarmos um deploy validado. A Blitz também compila a aplicação no Dockerfile (mesmo com `-DskipTests`): essa opção ignora a execução dos testes, **não** a compilação das classes Java.

Em alterações das entidades JPA ou do `pom.xml`, verificar especialmente declarações duplicadas de atributos/métodos e dependências Maven repetidas. Erros de compilação impedem a publicação da versão nova, embora a Blitz possa continuar servindo a versão anterior.

Após o CI verde, confirmar na Blitz o deploy do **novo commit** e então validar health check, Flyway e os fluxos de autenticação da Etapa 4.

Os testes cobrem identificação da API, health check, geração de OpenAPI, CORS de origem local e rejeição de origem não autorizada. O teste de Spring Modulith verifica ciclos e limites das dependências entre módulos. Na Etapa 3, os testes de contexto e persistência passam a iniciar PostgreSQL 18 isolado com Testcontainers, verificando migração V1, repositórios de usuários e contas e vínculos de titularidade. O CI da Etapa 3 ainda precisa ser observado após o commit; a publicação da API na Blitz não substitui essa verificação.

## Critério de conclusão da Etapa 1

A Etapa 1 foi **validada** após a publicação no Netlify e a aprovação do workflow `Frontend Angular CI #3`, conforme o resultado enviado em 27/10/2026.

## Próximos testes

As etapas posteriores acrescentarão testes de domínio, autorização, PostgreSQL com Testcontainers, concorrência, idempotência e consistência transacional, com bancos de teste isolados de ambientes de produção.

## Testes PostgreSQL da Etapa 3

O workflow `backend-ci.yml` executa `mvn -B -ntp clean verify` em runner Ubuntu com Docker. As classes `SystemApiIntegrationTest` e `PersistenceIntegrationTest` utilizam `PostgresIntegrationTest`, que configura um container PostgreSQL 18 temporário por `@DynamicPropertySource`. As variáveis do Neon **não são necessárias nem devem ser colocadas em secrets do Actions**.

Verificações principais:

- Inicialização da aplicação e contrato HTTP com datasource real de teste.
- Aplicação automática de `V1__initial_banking_schema.sql` pelo Flyway.
- Validação de esquema Hibernate em `ddl-auto=validate`.
- Persistência e consulta de usuário, conta e titularidade, com rollback por teste.
- Verificação de limites modulares pelo Spring Modulith.

Em ambiente próprio com Docker e Java 25: `cd backend && mvn clean verify`. O CI verde será a confirmação do funcionamento; o código foi preparado sem executar os testes Maven completos no ambiente de geração da entrega.


## Testes da Etapa 4 — autenticação

`AuthIntegrationTest` usa Testcontainers/PostgreSQL 18 e MockMvc para cobrir cadastro, sessão, `GET /me`, logout/revogação, novo login com BCrypt, rejeição de senha incorreta, prevenção de duplicidade, senha curta, demo com papel de cliente e não persistência do token em texto puro. O CI do Angular cobre a tela editável e a integração HTTP de autenticação.

A etapa exige **ambos os workflows verdes** e o teste manual na aplicação publicada: cadastro → logout → login novamente → F5 → logout → token anterior rejeitado. Verifique Flyway V2 na Blitz/Neon. O pacote não recebeu confirmação de execução real de Maven ou de Angular no ambiente de geração; somente o CI após o commit confirma o resultado.


## Hotfix da Etapa 4 — tipo da coluna de hash da sessão

A migração `V2__authentication_and_sessions.sql` define `auth_sessions.token_hash`
como `CHAR(64)`. A entidade `AuthSession` deve usar `@Column(columnDefinition = "char(64)")`
para corresponder ao tipo real do PostgreSQL durante a verificação `ddl-auto=validate`.
**Não edite a migração V2 já executada nem altere o esquema do Neon manualmente.**

O workflow `Backend Java CI` agora publica `monavero-backend-surefire-reports`
como artefato quando houver falhas, incluindo os relatórios de testes e as primeiras
exceções. O deploy só será considerado validado depois de CI verde, publicação da
versão `0.4.0-SNAPSHOT` na Blitz e testes reais de cadastro, login, logout e demonstração.
O Dockerfile atualmente usa `-DskipTests` por tempo de construção; portanto,
`BUILD SUCCESS` na Blitz **não substitui** o GitHub Actions.

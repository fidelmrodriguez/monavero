# Testes e integração contínua

## Frontend Angular

A configuração de CI fica em [`.github/workflows/frontend-ci.yml`](../.github/workflows/frontend-ci.yml). O workflow é acionado em `push` e `pull_request` na `main`, além de permitir execução manual, e prepara Node.js 22 e Chrome for Testing.

| Verificação | Comando (em `frontend/`) | Objetivo |
| --- | --- | --- |
| Tipagem TypeScript | `npm run typecheck` | Identificar erros de tipos no código Angular. |
| Build | `npm run build` | Compilar frontend estático, TypeScript e templates Angular. |
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
- Atualização direta de rotas internas sem erro 404; verificar fallback SPA no Netlify.
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

A etapa exige **ambos os workflows verdes** e o teste manual na aplicação publicada: cadastro → logout → login novamente → F5 → logout → token anterior rejeitado. Verifique Flyway V3 na Blitz/Neon (V1 e V2 preservadas). O pacote não recebeu confirmação de execução real de Maven ou de Angular no ambiente de geração; somente o CI após o commit confirma o resultado.


## Correção da Etapa 4 — Flyway V3 e tipo do hash de sessão

A migração **V2 já foi executada** no Neon e criou `auth_sessions.token_hash` como
`CHAR(64)` (`bpchar` / JDBC `Types.CHAR`). O Hibernate 7, usando a entidade
Java `String`, espera `Types.VARCHAR`. Os logs de execução da Blitz nos commits
`733d3a4` e `48a3d86` confirmaram a falha ao inicializar o JPA:

```text
Schema validation: wrong column type encountered in column [token_hash]
in table [auth_sessions]; found [bpchar (Types#CHAR)],
but expecting [char(64) (Types#VARCHAR)]
```

As tentativas anteriores de forçar `columnDefinition = "char(64)"` e
`@JdbcTypeCode(SqlTypes.CHAR)` não resolveram a validação na versão publicada.
Esta correção **não altera V1/V2, não desabilita `ddl-auto=validate` e não
executa DDL manual no Neon**: adiciona `V3__align_auth_session_token_hash_varchar.sql`,
que o Flyway executará uma única vez na inicialização, convertendo apenas
`token_hash` para `VARCHAR(64)` e preservando as sessões e sua unicidade.

O tipo padrão `VARCHAR` passa a corresponder ao mapeamento `@Column(length = 64)`
na entidade `AuthSession`. Os hashes SHA-256 gerados pelo backend têm exatamente
64 dígitos hexadecimais, portanto a conversão não altera os valores válidos.

`PersistenceIntegrationTest` agora verifica a aplicação bem-sucedida da V3
e o tipo e o limite de 64 caracteres no PostgreSQL isolado via Testcontainers.
Executar `cd backend && mvn -B -ntp clean verify` com Java 25 e Docker; não
considerar `BUILD SUCCESS` da Blitz suficiente, pois seu Dockerfile pula testes.
O workflow `Backend Java CI` armazena os relatórios Surefire quando houver falha.

**Critério de conclusão:** Backend Java CI verde, início estável da versão
`0.4.0-SNAPSHOT` na Blitz e validação de cadastro, login, sessão demo e logout.
Não editar versões Flyway antigas, não executar comandos SQL manuais e não
apagar registros do banco.


### Validar a Etapa 5

1. `cd backend && mvn -B -ntp clean verify` com Java 25 e Docker/Testcontainers disponíveis. A migração V4 e o isolamento de contas são exercitados em `BankingIntegrationTest`.
2. `cd frontend && npm install && npm test` e `npm run build` (ou `npm ci` se houver lockfile) com Node conforme `.nvmrc`.
3. Confirmar Flyway em `public.flyway_schema_history` (versões 1–4) e inicialização do backend sem erro.
4. Verificar login de duas contas pessoais distintas: contas/lançamentos não devem se misturar; depois de sair e entrar novamente, o identificador da conta deve permanecer.
5. Confirmar User/1234 com histórico de demonstração e observar que 502 de despertar não encerra a sessão; login concluído deve ir direto ao dashboard.

### Etapa 6 — transferências

A classe `TransferIntegrationTest` usa Testcontainers/PostgreSQL real no CI para verificar:
- Flyway V5 aplicada e contexto Spring carregado.
- Autenticação obrigatória, permissão por titularidade e isolamento da demonstração.
- Transferência atômica entre duas contas do demo, conservação do total e dois lançamentos simétricos.
- Reenvio com a mesma chave de idempotência, sem novo débito; chave reaproveitada com outro valor retorna 409.
- Saldo insuficiente e origem igual ao destino são rejeitados.

Os testes Angular verificam a chamada HTTP, confirmação somente após sucesso e tratamento de falha. **Não executar `-DskipTests` como critério de aprovação da etapa**: usar `mvn -B -ntp clean verify` no CI e `npm test -- --watch=false` conforme workflow Angular. Não considerar a etapa validada sem CI e deploy.

### Qualidade da interface de transferências

O produto não deve exibir mensagens como “Teste da Etapa”, instruções de QA ou nomes de tecnologia interna para clientes. A agência e a conta de origem precisam permanecer visíveis, os campos não devem se deslocar ao validar erros e o valor inicia vazio. Os testes da `TransfersPage` cobrem essas condições. Logs de autenticação, carregamento e transferências são restritos ao console, sem credenciais, tokens ou números integrais de conta.

## Transferências entre titulares distintos — teste de aceitação

1. Criar uma conta pessoal A pelo cadastro, entrar e abrir o dashboard. Conferir o crédito de abertura de R$ 1.000,00 e anotar agência e número da conta (não é necessário compartilhar credenciais).
2. Sair, criar a conta pessoal B com **outro e-mail**, entrar e anotar a agência e número da conta B. Conferir seu crédito único de abertura.
3. Voltar ao login de A, abrir Transferências, selecionar a origem A, preencher agência e número de B e transferir R$ 100,00.
4. Conferir saldo A = R$ 900,00, um débito no extrato e confirmação da API (caso não haja outras operações).
5. Entrar na conta B e conferir saldo B = R$ 1.100,00, um crédito no extrato; repetir F5 e verificar persistência.
6. Verificar no backend CI os testes de idempotência, origem não pertencente ao usuário, limite de saldo, proibição de envio à conta pública demo e migração V6.

O crédito de abertura é **fictício**, exclusivamente para o portfólio, e não representa fundos reais. Mensagens de QA não são exibidas nas telas do produto; diagnósticos técnicos permanecem no console.

### Contraparte e confirmação visual — regressão

- Testar A → B com dois titulares pessoais de **nomes diferentes**: no extrato de A deve aparecer `Enviado para <nome B>`, e no extrato de B, `Recebido de <nome A>`; número da conta da contraparte exibido com apenas os quatro últimos caracteres.
- Confirmar que o destinatário visualiza o nome efetivamente cadastrado do remetente, mesmo que a descrição livre contenha outro texto. Reabrir o extrato de transferências anteriores para validar enriquecimento retroativo.
- Após sucesso, a mensagem de confirmação deve continuar visível, sem aviso vermelho de valor obrigatório no campo limpo. Nova transferência só pode ser enviada após informar novo valor válido.
- Testes: `TransferIntegrationTest` (contraparte e mascaramento), `TransfersPage` (limpeza da validação), `StatementPage` e `DashboardPage` (renderização). O CI Java e Angular completo devem passar antes do fechamento desta correção.

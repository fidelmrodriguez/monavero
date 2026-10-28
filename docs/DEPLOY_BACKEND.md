# Deploy do backend Java na Blitz Cloud · Monavero

O backend Java 25 / Spring Boot 4.1.1 está hospedado na **Blitz Cloud** no serviço independente `Monavero API`. A Etapa 3 adiciona **persistência PostgreSQL no Neon**; portanto, o backend passa a exigir variáveis de banco para inicializar. O Angular continua no Netlify, sem alterações.

## Situação da infraestrutura

| Camada | Serviço | Observação |
| --- | --- | --- |
| Interface | Netlify | Angular 19, ainda com dados fictícios/DummyJSON |
| API | Blitz Cloud | `https://monavero-api.fidelmrodriguez.blitz.cloud` |
| Banco | Neon | Projeto `monavero`, branch `production`, database `neondb`, PostgreSQL 18 (Ohio) |

A publicação anterior da API foi validada por Swagger, `/api/v1/system/info` e `/actuator/health`. A conexão com Neon e as migrações ainda precisam ser validadas depois de aplicar este ZIP.

## Ordem de implantação da Etapa 3 — importante

**Configure as variáveis de banco na Blitz ANTES de enviar o commit que adiciona JPA/Flyway.** Sem elas, o novo backend não conseguirá iniciar; essa falha é intencional para evitar conexão com banco fictício ou errado.

1. No Neon, projeto `monavero` → **Connect** → branch `production`, database `neondb`.
2. Desligue **Connection pooling**. Copie somente para uso privado o **host direto**, usuário e senha. O host direto não contém `-pooler`.
3. Converta o host para JDBC, sem colocar usuário e senha na URL. Exemplo ilustrativo:

   ```text
   jdbc:postgresql://HOST-DIRETO.us-east-2.aws.neon.tech:5432/neondb?sslmode=require
   ```

   Se a conexão do Neon exigir channel binding, o PostgreSQL JDBC aceita `channelBinding=require` como parâmetro adicional. Não copie `postgresql://usuario:senha@...` diretamente para a variável JDBC.
4. Na Blitz, abra **Monavero API → Environment** e cadastre as três variáveis privadas:

   | Variável | Conteúdo |
   | --- | --- |
   | `MONAVERO_DB_JDBC_URL` | URL JDBC direta (com `sslmode=require`) |
   | `MONAVERO_DB_USERNAME` | role apresentada no Neon, por exemplo `neondb_owner` |
   | `MONAVERO_DB_PASSWORD` | senha da role; **não compartilhe** |

   Mantenha `MONAVERO_CORS_ALLOWED_ORIGINS=https://monavero.netlify.app` caso esse seja o domínio exato publicado. A variável `PORT` permanece opcional (padrão `8080`).
5. Salve as variáveis. A versão antiga do backend ainda não precisa delas.
6. Aplique o ZIP da Etapa 3 ao repositório, faça **um único commit** e envie para `main`. O GitHub Actions e o deploy automático na Blitz serão disparados.
7. Acompanhe o **Backend Java CI**, os logs da Blitz e o status da aplicação. O primeiro início pode levar mais tempo por executar Flyway. **Não realize alterações manuais de schema no Neon**.
8. Confirme os endpoints existentes e as tabelas via Neon SQL Editor; veja [Persistência](PERSISTENCIA.md).

## Configurações preservadas da Blitz

| Campo | Valor |
| --- | --- |
| GitHub | `fidelmrodriguez/monavero` |
| Branch | `main` |
| Folder to build | `backend` |
| Dockerfile | `Dockerfile` existente dentro de `backend/` |
| Start command | Vazio, conforme Dockerfile |
| Porta | `8080` por padrão, aceita `PORT` |
| Banco nativo da Blitz | Nenhum: o PostgreSQL está no Neon |

O serviço continua HTTP (não um worker). A Blitz usa `backend/` como contexto de build, sem tentar compilar o Angular.

## Verificações após deploy

- Logs de inicialização: conexão PostgreSQL estabelecida, migração `V1` concluída ou reconhecida como aplicada, Hibernate validando o esquema, aplicação iniciada sem exceções.
- <https://monavero-api.fidelmrodriguez.blitz.cloud/actuator/health> — JSON contendo `"status":"UP"`.
- <https://monavero-api.fidelmrodriguez.blitz.cloud/api/v1/system/info> — identificação da API.
- <https://monavero-api.fidelmrodriguez.blitz.cloud/swagger-ui.html> — contrato OpenAPI; ainda não apresenta endpoints de contas.
- Neon SQL Editor: `flyway_schema_history`, `app_users`, `bank_accounts`, `account_holders`.

O health check pode retornar `DOWN` se o PostgreSQL estiver inacessível. Dados internos e credenciais nunca devem ser mostrados na resposta HTTP; o Actuator já está com detalhes desabilitados.

## Diagnóstico

| Sintoma | Causa / verificação |
| --- | --- |
| `Could not resolve placeholder MONAVERO_DB_...` | Uma das três variáveis obrigatórias está ausente na Blitz |
| `Connection refused`, timeout ou `password authentication failed` | Conferir host direto, porta 5432, role, senha e TLS, **sem publicar os valores** |
| `Failed to validate schema` | Flyway não aplicou a migração ou mapeamento diverge do SQL; consultar logs e `flyway_schema_history` |
| `Flyway checksum mismatch` | Arquivo V1 foi alterado depois de aplicado; restaurar o SQL original, não executar `repair` indiscriminadamente |
| CI falha em Testcontainers/Docker | Conferir etapa Docker do runner e logs do Maven; não configurar secrets Neon no CI |
| Nenhum endpoint novo no Swagger | Esperado: Etapa 3 só cria persistência e não expõe CRUD sem autenticação |

A Etapa 4 adicionará Spring Security e autorização. Nada neste deploy habilita transações bancárias reais.

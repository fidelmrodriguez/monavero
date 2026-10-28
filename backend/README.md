# Backend · Monavero

API Java do **Monavero**, ambiente bancário exclusivamente demonstrativo. A aplicação utiliza Java 25, Spring Boot 4.1.1 e Spring Modulith, é executada na Blitz Cloud e incorpora persistência PostgreSQL a partir da **Etapa 3**. A interface Angular continua publicada separadamente no Netlify e agora autentica na API Java. Dados de dashboard e extrato ainda são fictícios e usam DummyJSON.

[Visão geral](../README.md) · [Frontend](../frontend/README.md) · [Arquitetura](../docs/ARQUITETURA.md) · [Persistência](../docs/PERSISTENCIA.md) · [Deploy na Blitz](../docs/DEPLOY_BACKEND.md) · [Roadmap](../docs/ROADMAP.md)

## Tecnologias

| Componente | Utilização |
| --- | --- |
| Java 25 + Spring Boot 4.1.1 | Aplicação e ciclo de vida |
| Spring MVC / Bean Validation | HTTP, validações e respostas JSON |
| Spring Modulith 2.1.1 | Verificação de dependências entre módulos |
| Spring Data JPA + Hibernate | Mapeamento de entidades e repositórios |
| PostgreSQL 18 / Neon | Persistência de dados fictícios |
| Flyway | Criação e evolução versionada do esquema |
| Spring Security + BCrypt | Autenticação e verificação de senhas |
| Sessões opacas no PostgreSQL | Expiração, validação e revogação efetiva no logout |
| Spring Boot Actuator | Health check |
| Springdoc OpenAPI / Swagger | Contrato HTTP público |
| JUnit, MockMvc e Testcontainers | Testes de integração com PostgreSQL isolado |
| Maven, Docker e GitHub Actions | Build, publicação e CI |

## Estrutura

```text
backend/
├── pom.xml
├── Dockerfile
└── src/
    ├── main/
    │   ├── java/com/monavero/api/
    │   │   ├── config/        # HTTP, CORS, OpenAPI, erros
    │   │   ├── system/        # Identificação pública da API
    │   │   ├── auth/          # Spring Security, sessões e endpoints de autenticação
    │   │   ├── identity/      # Entidade de usuário e repositório
    │   │   └── accounts/      # Contas, titularidade e repositórios
    │   └── resources/
    │       ├── application.yml
    │       └── db/migration/        # V1 banco; V2 autenticação
    └── test/java/com/monavero/api/  # HTTP, persistência e módulos
```

**Persistência já preparada em código:** tabelas `app_users`, `bank_accounts`, `account_holders` e `flyway_schema_history`, com UUIDs, índices, chaves estrangeiras e restrições. A Etapa 4 adiciona hashes BCrypt, roles e sessões ao banco por V2; nenhum endpoint de contas foi exposto. As contas iniciam com saldo zero e não existe endpoint para manipulá-las. O saldo é reservado à implementação de lançamentos transacionais nas próximas etapas, nunca alterado pelo Angular.

As referências de titularidade são armazenadas como UUIDs no módulo de contas, com integridade garantida pelas chaves estrangeiras do PostgreSQL, sem dependências Java entre os módulos `identity` e `accounts`.

## Configuração do banco

É necessário um PostgreSQL acessível para iniciar a aplicação, inclusive ao executar o backend localmente. Na Blitz, configure estas **variáveis de ambiente privadas** na aba Environment:

| Variável | Exemplo de formato (sem credenciais reais) |
| --- | --- |
| `MONAVERO_DB_JDBC_URL` | `jdbc:postgresql://HOST-DIRETO:5432/neondb?sslmode=require` |
| `MONAVERO_DB_USERNAME` | `neondb_owner` (se essa for sua role do Neon) |
| `MONAVERO_DB_PASSWORD` | senha da role, configurada somente na Blitz |
| `MONAVERO_CORS_ALLOWED_ORIGINS` | `https://monavero.netlify.app` (domínio exato publicado) |
| `MONAVERO_DEMO_ENABLED` | `true` padrão; `false` desabilita o login público demo |

A URL para JDBC **não é** a string URI `postgresql://...` copiada do Neon. Use o host obtido em **Connect → Connection pooling desligado**, sem usuário ou senha embutidos. Mantenha TLS (`sslmode=require`). Consulte o [guia de deploy](../docs/DEPLOY_BACKEND.md) antes do commit que ativa o banco.

O projeto não traz valores reais, `.env`, credenciais ou bases pré-populadas. O Hibernate utiliza `ddl-auto=validate`: não cria ou modifica tabelas automaticamente. O Flyway executa `V1` e `V2` quando necessários e valida o esquema. Uma migração já aplicada deve permanecer imutável.

## Executar e testar

Pré-requisitos: JDK 25, Maven 3.9+, Docker para os testes de integração; PostgreSQL configurado somente para execução da API.

```bash
cd backend
mvn -B clean verify        # Testcontainers usa banco temporário, sem acessar o Neon
mvn spring-boot:run        # requer MONAVERO_DB_JDBC_URL, USERNAME e PASSWORD
```

O CI usa Docker no runner GitHub para executar PostgreSQL em container. Os testes existentes de HTTP também utilizam esse banco isolado. Não é necessário instalar Docker na sua máquina para usar o GitHub Actions ou a Blitz.

### Endpoints HTTP da Etapa 4

| Método / caminho | Finalidade |
| --- | --- |
| `GET /api/v1/system/info` | Identificação e estado público da API |
| `GET /actuator/health` | Saúde, sem expor detalhes internos |
| `GET /v3/api-docs` | Documento OpenAPI |
| `GET /swagger-ui.html` | Interface Swagger |
| `POST /api/v1/auth/register` | Cadastro pessoal (nome, e-mail, senha forte), cria sessão automaticamente |
| `POST /api/v1/auth/login` | Login pessoal (e-mail e senha) |
| `POST /api/v1/auth/demo` | Acesso à conta de demonstração, somente quando habilitado |
| `GET /api/v1/auth/me` | Perfil autenticado; exige `Authorization: Bearer <token>` |
| `POST /api/v1/auth/logout` | Revogação do token; exige `Authorization: Bearer <token>` |

**Não existem endpoints de contas e movimentações bancárias nesta etapa.** O modelo de contas continua interno; consultas bancárias autorizadas serão implementadas na Etapa 5. A API ainda não processa transferências, pagamentos ou dinheiro real.

## Validação de autenticação — Etapa 4

Após inserir variáveis na Blitz, aplicar o commit e concluir o deploy:

1. Confirmar `Backend Java CI` e `Frontend Angular CI` aprovados.
2. Na Blitz, conferir execução de `V2` e health `UP`; no Neon, `auth_sessions` e colunas novas de `app_users`.
3. No Netlify, criar conta pessoal, sair e entrar novamente; conferir refresh e bloqueio de credenciais inválidas.
4. Confirmar acesso demo e que nenhum perfil pode ser promovido a admin pelo formulário.
5. Não enviar senhas, hashes ou tokens em logs ou prints.

Veja [Persistência](../docs/PERSISTENCIA.md) e [Roadmap](../docs/ROADMAP.md).

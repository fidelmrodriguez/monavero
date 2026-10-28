# Backend · Monavero

API Java do **Monavero**, ambiente bancário exclusivamente demonstrativo. A aplicação utiliza Java 25, Spring Boot 4.1.1 e Spring Modulith, é executada na Blitz Cloud e incorpora persistência PostgreSQL a partir da **Etapa 3**. A interface Angular continua publicada separadamente no Netlify e, por enquanto, utiliza a DummyJSON e dados fictícios.

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
    │   │   ├── identity/      # Entidade de usuário e repositório
    │   │   └── accounts/      # Contas, titularidade e repositórios
    │   └── resources/
    │       ├── application.yml
    │       └── db/migration/V1__initial_banking_schema.sql
    └── test/java/com/monavero/api/  # HTTP, persistência e módulos
```

**Persistência já preparada em código:** tabelas `app_users`, `bank_accounts`, `account_holders` e `flyway_schema_history`, com UUIDs, índices, chaves estrangeiras e restrições. Usuários ainda não possuem senhas nem sessões: Spring Security entra na Etapa 4. As contas iniciam com saldo zero e não existe endpoint para manipulá-las. O saldo é reservado à implementação de lançamentos transacionais nas próximas etapas, nunca alterado pelo Angular.

As referências de titularidade são armazenadas como UUIDs no módulo de contas, com integridade garantida pelas chaves estrangeiras do PostgreSQL, sem dependências Java entre os módulos `identity` e `accounts`.

## Configuração do banco

É necessário um PostgreSQL acessível para iniciar a aplicação, inclusive ao executar o backend localmente. Na Blitz, configure estas **variáveis de ambiente privadas** na aba Environment:

| Variável | Exemplo de formato (sem credenciais reais) |
| --- | --- |
| `MONAVERO_DB_JDBC_URL` | `jdbc:postgresql://HOST-DIRETO:5432/neondb?sslmode=require` |
| `MONAVERO_DB_USERNAME` | `neondb_owner` (se essa for sua role do Neon) |
| `MONAVERO_DB_PASSWORD` | senha da role, configurada somente na Blitz |
| `MONAVERO_CORS_ALLOWED_ORIGINS` | `https://monavero.netlify.app` (domínio exato publicado) |

A URL para JDBC **não é** a string URI `postgresql://...` copiada do Neon. Use o host obtido em **Connect → Connection pooling desligado**, sem usuário ou senha embutidos. Mantenha TLS (`sslmode=require`). Consulte o [guia de deploy](../docs/DEPLOY_BACKEND.md) antes do commit que ativa o banco.

O projeto não traz valores reais, `.env`, credenciais ou bases pré-populadas. O Hibernate utiliza `ddl-auto=validate`: não cria ou modifica tabelas automaticamente. O Flyway executa `V1` na inicialização e valida o esquema. Uma migração já aplicada deve permanecer imutável.

## Executar e testar

Pré-requisitos: JDK 25, Maven 3.9+, Docker para os testes de integração; PostgreSQL configurado somente para execução da API.

```bash
cd backend
mvn -B clean verify        # Testcontainers usa banco temporário, sem acessar o Neon
mvn spring-boot:run        # requer MONAVERO_DB_JDBC_URL, USERNAME e PASSWORD
```

O CI usa Docker no runner GitHub para executar PostgreSQL em container. Os testes existentes de HTTP também utilizam esse banco isolado. Não é necessário instalar Docker na sua máquina para usar o GitHub Actions ou a Blitz.

### Endpoints públicos atuais

| Método / caminho | Finalidade |
| --- | --- |
| `GET /api/v1/system/info` | Identificação e estado público da API |
| `GET /actuator/health` | Saúde, sem expor detalhes internos |
| `GET /v3/api-docs` | Documento OpenAPI |
| `GET /swagger-ui.html` | Interface Swagger |

**Não existem endpoints bancários públicos nesta etapa.** O modelo é interno e será exposto somente depois de implementar autenticação e autorização. A API ainda não processa transferências, pagamentos ou dinheiro real.

## Validação da Etapa 3

Após inserir variáveis na Blitz, aplicar o commit e concluir o deploy:

1. Validar **Backend Java CI** (Maven, Testcontainers e verificação modular).
2. Conferir os logs da Blitz e a execução da migração Flyway `V1` sem falhas.
3. Confirmar `/actuator/health` com status `UP` e Swagger funcionando.
4. No Neon, verificar as tabelas e `flyway_schema_history` sem fornecer a conexão no chat.
5. Manter frontend e Orquestria inalterados.

Veja [Persistência](../docs/PERSISTENCIA.md) e [Roadmap](../docs/ROADMAP.md).

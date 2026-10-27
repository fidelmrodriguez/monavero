# Backend · Monavero

A API do **Monavero** é a camada Java que sustentará, de forma incremental, as operações do ambiente bancário demonstrativo. Esta etapa entrega a **fundação HTTP executável**: inicialização, identificação pública do serviço, health check, contrato OpenAPI, CORS configurável, tratamento de erros de validação e testes automatizados.

[Visão geral](../README.md) · [Frontend Angular](../frontend/README.md) · [Arquitetura](../docs/ARQUITETURA.md) · [Roadmap](../docs/ROADMAP.md) · [Publicação do backend](../docs/DEPLOY_BACKEND.md)

## Tecnologias utilizadas

| Componente | Versão / finalidade |
| --- | --- |
| Java | 25 (LTS) |
| Spring Boot | 4.1.1 |
| Spring MVC | APIs REST em JSON |
| Spring Modulith | 2.1.1, validação dos limites entre módulos |
| Spring Boot Actuator | Health check e informações operacionais |
| Springdoc OpenAPI | 3.2.0, documentação Swagger |
| Bean Validation | Validação de contratos futuros |
| JUnit / MockMvc | Testes de endpoints, CORS e inicialização |
| Maven | Build, testes e empacotamento |

Spring Security, PostgreSQL, Hibernate, Flyway e Testcontainers **não estão integrados nesta etapa**. Serão introduzidos quando houver autenticação e dados persistidos. O backend ainda não atende login ou transações financeiras.

## Organização

```text
backend/
├── pom.xml
├── Dockerfile
├── src/
│   ├── main/java/com/monavero/api/
│   │   ├── MonaveroApiApplication.java
│   │   ├── config/        # CORS, OpenAPI e erros HTTP
│   │   └── system/        # Informações públicas da API
│   ├── main/resources/application.yml
│   └── test/java/com/monavero/api/  # Testes de contrato e arquitetura
└── README.md
```

Os próximos módulos de negócio (`identity`, `accounts`, `transfers`, `payments`, `audit`) serão criados quando forem implementados. Não há endpoints fictícios para essas funcionalidades.

## Executar no Codespaces

Pré-requisitos: **JDK 25** e **Maven 3.9+**.

```bash
cd backend
mvn clean verify
mvn spring-boot:run
```

A API inicia na porta 8080 (`PORT` pode ser usado em hospedagens cloud). O frontend continua no Netlify e **ainda utiliza a DummyJSON**, sem chamadas para este servidor.

### Endpoints disponíveis

| Rota | Resposta | Uso |
| --- | --- | --- |
| `GET /api/v1/system/info` | JSON com nome e estado público do serviço | Identificação / smoke test |
| `GET /actuator/health` | `{"status":"UP"}` | Health check |
| `GET /v3/api-docs` | JSON OpenAPI | Contrato HTTP |
| `GET /swagger-ui.html` | Interface Swagger | Explorar API |

Teste rápido:

```bash
curl -fsS http://localhost:8080/api/v1/system/info
curl -fsS http://localhost:8080/actuator/health
```

A API não implementa cadastro, login, contas, transferências, pagamentos ou auditoria persistente nesta fase.

## Configuração e segurança

| Variável de ambiente | Padrão | Aplicação |
| --- | --- | --- |
| `PORT` | `8080` | Porta do serviço HTTP |
| `MONAVERO_CORS_ALLOWED_ORIGINS` | `http://localhost:4200` | Origens permitidas para chamadas de `/api/**`; aceita lista separada por vírgulas |

Ao publicar o serviço, configure a origem HTTPS exata do frontend Netlify, por exemplo: `https://SEU-SITE.netlify.app`. Não configure `*` como origem. A configuração atual não utiliza cookies ou sessões autenticadas; os controles de autenticação serão desenvolvidos na Etapa 4.

As mensagens de erro de validação utilizam `application/problem+json`, sem devolver valores rejeitados nem informações internas. O Actuator expõe somente `health` e `info`, sem detalhes sensíveis de saúde.

## Publicação na Blitz Cloud

A hospedagem prevista para a API é a **Blitz Cloud**, mantendo o Angular no Netlify. Ao selecionar o repositório `monavero`, informe **`backend`** em **Folder to build**, utilize o `Dockerfile` já incluído nesta pasta e selecione a branch `main`. A aplicação responde pela porta `8080` (ou variável `PORT`) e permite configurar `MONAVERO_CORS_ALLOWED_ORIGINS` com a URL HTTPS real do frontend.

O passo a passo do painel, configurações, variáveis e testes de saúde está em [Publicação do backend na Blitz Cloud](../docs/DEPLOY_BACKEND.md). Esta etapa ainda depende da aprovação do CI e da verificação da URL publicada.

## Testes e qualidade

```bash
cd backend
mvn -B -ntp clean verify
```

O workflow [Backend Java CI](../.github/workflows/backend-ci.yml) executa o mesmo comando no GitHub Actions com JDK 25. Os testes verificam o endpoint de identificação, o health check, o contrato OpenAPI, a política de CORS e as dependências entre módulos Spring Modulith.

**Critério de conclusão da Etapa 2:** build e testes aprovados no Actions, API publicada em serviço cloud Java, `health` e Swagger acessíveis sem interromper o Netlify. O ZIP implementa o código e a configuração inicial, mas não comprova publicação ou execução dos testes antes da primeira execução do CI.

## Próximas entregas

- **Etapa 3:** PostgreSQL + JPA + Flyway e modelo de dados bancário inicial.
- **Etapa 4:** Spring Security, credenciais próprias, autorização e sessões.
- **Etapas 5 a 10:** contas, extrato, transferências, agendamentos, pagamentos e auditoria.

O produto é **demonstrativo**: não opera dinheiro real, Pix bancário ou compensação de boletos.

# Publicação do backend na Blitz Cloud · Monavero

A Etapa 2 utiliza a **Blitz Cloud** para executar a API Java e o **Netlify** para manter o Angular publicado separadamente. A API é demonstrativa: ainda não possui banco PostgreSQL, login ou endpoints financeiros. O objetivo deste deploy é validar a fundação Spring Boot e os endpoints públicos.

> **Estado da etapa:** este guia prepara a publicação; não afirma que o Backend Java CI ou o deploy já passaram. Conferir os resultados reais depois do commit.

## Pré-requisitos

- Repositório [`fidelmrodriguez/monavero`](https://github.com/fidelmrodriguez/monavero) com o backend presente em `backend/`.
- Workflow **Backend Java CI** aprovado, ou seus erros corrigidos antes de tratar o deploy como validado.
- Conta Blitz Cloud com acesso ao repositório GitHub (ou URL pública do repositório).
- URL HTTPS exata do frontend publicado no Netlify, usada para a política de CORS.

## Criar o serviço na Blitz Cloud

1. Entre em [dashboard.blitz.cloud](https://dashboard.blitz.cloud/) e selecione **Host something new**.
2. Escolha **My own code** e selecione `fidelmrodriguez/monavero` (ou cole a URL pública do repositório).
3. Selecione a branch **`main`**.
4. Em **Advanced settings**, informe **`backend`** em **Folder to build**. Essa é a configuração mais importante porque este repositório também contém o Angular. A Blitz tratará `backend/` como raiz do projeto a compilar.
5. Se precisar selecionar manualmente o Dockerfile, escolha o arquivo existente em **`backend/Dockerfile`** (ele aparecerá como `Dockerfile` quando a seleção for relativa à pasta `backend`). Não use um Dockerfile gerado automaticamente para a raiz do monorepositório.
6. Dê um nome ao serviço (sugestão: `monavero-api`, se disponível) e inicie o build/deploy. A URL pública exata será fornecida pela Blitz; não presuma um endereço antes da criação.
7. Confira na área de logs se a Blitz executou o Dockerfile Maven/Java e não tentou compilar o Angular. A configuração utiliza **Java 25** e publica a porta **8080**.

A Blitz aceita diretamente Dockerfiles de subpastas e a opção *Folder to build* para monorepositórios. Referência: [Deploy de projetos GitHub na Blitz Cloud](https://blitz.cloud/docs/deploy-from-github/).

## Variáveis de ambiente

Na seção **Environment** do serviço na Blitz, configure:

| Variável | Exemplo / valor | Obrigatória? |
| --- | --- | --- |
| `MONAVERO_CORS_ALLOWED_ORIGINS` | `https://seu-site.netlify.app` | Recomendável ao conectar navegador e API; use **a URL real**, sem barra final |
| `PORT` | `8080` | Opcional; o `application.yml` já usa `8080` como padrão e aceita a porta enviada pela Blitz |

- Para mais de uma origem autorizada, separe URLs por vírgula: `https://seu-site.netlify.app,https://www.seu-dominio.com`.
- **Não** configure `*` para CORS; a aplicação rejeita o curinga deliberadamente.
- Não há nesta etapa `DATABASE_URL`, credenciais de PostgreSQL, segredos de JWT nem variáveis financeiras. Esses recursos serão introduzidos nas etapas seguintes.
- Após alterar variáveis no painel, aplique/reinicie o serviço conforme a interface da Blitz.

O navegador pode abrir o Swagger mesmo antes de configurar CORS. Já as requisições da aplicação Angular a `/api/**` precisarão da origem HTTPS autorizada quando a integração for implementada. **Não altere o frontend para usar a nova API nesta etapa**: ele continua com a autenticação e os dados demonstrativos existentes.

## Verificações após publicar

Substitua `https://URL-REAL-DA-API` pelo endereço HTTPS mostrado na Blitz:

| Verificação | Caminho | Resultado esperado |
| --- | --- | --- |
| Saúde | `/actuator/health` | HTTP 200 e JSON com `"status":"UP"` |
| Identificação | `/api/v1/system/info` | JSON com `application: monavero-api` e `status: available` |
| Contrato OpenAPI | `/v3/api-docs` | Documento JSON OpenAPI |
| Interface da API | `/swagger-ui.html` | Swagger UI carregada |

No terminal do Codespaces, se desejar validar também pela linha de comando:

```bash
curl -i https://URL-REAL-DA-API/actuator/health
curl -i https://URL-REAL-DA-API/api/v1/system/info
```

Os testes de health e Swagger demonstram que a API inicia e responde. **Eles ainda não validam autenticação nem transações bancárias**, que não existem na Etapa 2.

## Problemas comuns

| Sintoma | Conferência prioritária |
| --- | --- |
| Build detectou Angular ou Node.js | `Folder to build` deve ser exatamente `backend` |
| `COPY pom.xml` ou `COPY src` não encontra arquivos | Contexto do build incorreto: o Dockerfile foi concebido para ter `backend/` como contexto |
| Falha ao baixar dependências ou compilar Java | Ler o log da Blitz e o resultado do workflow **Backend Java CI**; não declarar deploy concluído |
| Serviço inicia mas o endereço não responde | Verificar porta `8080`/`PORT`, logs de inicialização e seleção do serviço HTTP |
| Navegador bloqueia chamada Angular → API | Configurar `MONAVERO_CORS_ALLOWED_ORIGINS` com a origem Netlify exata e reiniciar o serviço |
| Swagger abre, mas login e transferências não funcionam nele | Comportamento esperado: endpoints de negócio não foram implementados nesta etapa |

## Docker fora da Blitz (diagnóstico opcional)

Caso seja útil testar o mesmo contexto em um ambiente com Docker instalado, parta da raiz do monorepositório:

```bash
docker build -t monavero-api:local ./backend
docker run --rm -p 8080:8080 \
  -e MONAVERO_CORS_ALLOWED_ORIGINS=http://localhost:4200 \
  monavero-api:local
```

Não é necessário instalar Docker no seu computador para publicar na Blitz; a plataforma compila o Dockerfile a partir do GitHub.

## Critério de conclusão da Etapa 2

A etapa só será considerada validada depois de **Backend Java CI verde**, **deploy funcionando na Blitz**, health check e identificação retornando corretamente, e Swagger disponível. O Angular continua publicado e funcional no Netlify; a integração efetiva entre os serviços acontecerá depois, com o modelo de dados e a autenticação.

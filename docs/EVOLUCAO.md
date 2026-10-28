# Evolução técnica

O Monavero começa com uma interface Angular funcional e independente de backend próprio. A etapa seguinte é evoluir o produto sem descartar as telas, o design system e as regras de apresentação já implementadas.

## Base implementada

- Aplicação Angular standalone com SSR, rotas e estrutura por funcionalidades.
- Login demonstrativo e controle de navegação por perfil.
- Dashboard, extrato filtrável, transferências simuladas e pagamentos agendados em memória.
- Notificações, auditoria local, administração ilustrativa e preferências de tema.
- Estrutura de testes unitários e configuração de publicação no Netlify.

## Backend Java e persistência inicial

Na Etapa 2 foi iniciada uma API **Java 25 com Spring Boot 4.1.1**, com endpoint de identificação, health check, Swagger/OpenAPI, CORS e testes automatizados. A aplicação está publicada na Blitz. A Etapa 3 acrescenta persistência em PostgreSQL/Neon, Spring Data JPA, Hibernate e Flyway; os testes de integração utilizam PostgreSQL 18 com Testcontainers. A aplicação das migrações no Neon e o CI do backend precisam ser validados após este commit. A integração Angular–Java ainda não foi iniciada.

Frentes de evolução seguintes, preservando o modelo relacional inicial:

1. **Identidade e acesso:** cadastro e autenticação próprios, sessão segura e permissões conferidas no servidor.
2. **Contas:** entidades e titularidade já modeladas; consultas autorizadas, saldos operacionais e histórico ainda serão implementados.
3. **Movimentações:** lançamentos de débito e crédito, regras de saldo, idempotência e consistência transacional.
4. **Pagamentos:** agendamentos persistidos, estados de processamento e operações demonstrativas verificáveis.
5. **Auditoria:** eventos gerados no backend, segregação por conta e consulta autorizada.
6. **Integração e qualidade:** contratos da API, tratamento de erros, testes unitários, integração e fluxo completo Angular–Java.

O backend deve assumir as regras financeiras e de segurança. Validações existentes no Angular continuam úteis para a experiência do usuário, mas não substituem as validações no servidor.

## Princípios

- Preservar o frontend funcional durante a migração de dados simulados para endpoints reais.
- Não introduzir mensageria, microsserviços ou infraestrutura sem necessidade demonstrada.
- Priorizar integridade de dados, autorização, clareza de código, tratamento de erros e testes reproduzíveis.
- Documentar comportamento implementado separadamente de funcionalidades planejadas.

## Planejamento detalhado

O [roadmap](ROADMAP.md) separa as etapas de desenvolvimento, critérios de conclusão e status de validação.

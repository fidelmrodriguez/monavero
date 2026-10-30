# Evolução técnica

O Monavero começa com uma interface Angular funcional e independente de backend próprio. A etapa seguinte é evoluir o produto sem descartar as telas, o design system e as regras de apresentação já implementadas.

## Base implementada

- Aplicação Angular standalone com rotas e estrutura por funcionalidades; publicação atual como SPA estática no Netlify.
- Login demonstrativo e controle de navegação por perfil.
- Dashboard e extrato bancário integrados à API; transferências internas persistidas na etapa 6; pagamentos agendados ainda em memória.
- Notificações, auditoria local, administração ilustrativa e preferências de tema.
- Estrutura de testes unitários e configuração de publicação no Netlify.

## Backend Java e persistência inicial

Na Etapa 2 foi iniciada uma API **Java 25 com Spring Boot 4.1.1**, com endpoint de identificação, health check, Swagger/OpenAPI, CORS e testes automatizados. A aplicação está publicada na Blitz. A Etapa 3 acrescenta persistência em PostgreSQL/Neon, Spring Data JPA, Hibernate e Flyway; os testes de integração utilizam PostgreSQL 18 com Testcontainers. A migração V1 já foi validada no Neon e o CI do backend ficou verde. A Etapa 4 integrou cadastro, login, sessão opaca e logout. As Etapas 5 e 6 acrescentaram contas, extrato e transferências internas persistentes.

Frentes de evolução seguintes, preservando o modelo relacional inicial:

1. **Identidade e acesso:** cadastro, login, demo e sessão revogável implementados na Etapa 4; próximos passos incluem endurecimento operacional e permissões financeiras por titularidade.
2. **Contas:** entidades, titularidade, saldos e histórico persistentes implementados; ampliar casos de uso com operações futuras.
3. **Movimentações:** lançamentos de débito e crédito, regras de saldo, idempotência e consistência transacional implementados para transferências internas.
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

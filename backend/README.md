# Backend · Monavero

O backend do Monavero será a API Java responsável pela autenticação, persistência, autorização, integridade financeira e auditoria do ambiente bancário demonstrativo. **A implementação ainda não começou.** Neste momento, `backend/` contém somente esta documentação; não há `pom.xml`, endpoints, banco configurado ou serviço Java publicado.

[Visão geral](../README.md) · [Frontend Angular](../frontend/README.md) · [Arquitetura](../docs/ARQUITETURA.md) · [Roadmap](../docs/ROADMAP.md)

## Objetivo e responsabilidades

- **Identidade:** cadastro, login, logout, ciclo de sessão e credenciais armazenadas com hash seguro.
- **Autorização:** papéis cliente, gerente e administrador, com permissão verificada no backend e isolamento por titularidade.
- **Contas:** modelagem de contas de teste, identificação de titular, consulta de saldos e histórico.
- **Movimentações:** transferências entre contas internas de demonstração, lançamentos atômicos de débito e crédito, validação de saldo, limites e idempotência.
- **Agendamentos:** execução controlada, estados e cancelamentos de transferências e pagamentos simulados.
- **Auditoria:** registro das operações relevantes, rastreabilidade e proteção de dados sensíveis.
- **Observabilidade:** health checks, erros padronizados, documentação de endpoints e logs seguros.

Essas capacidades serão implementadas **por etapas**. Elas não estão disponíveis na versão Angular atual.

## Stack prevista

| Área | Tecnologia planejada |
| --- | --- |
| Plataforma | Java LTS e Spring Boot |
| Organização | Monólito modular com Spring Modulith |
| Autenticação e autorização | Spring Security |
| Persistência | PostgreSQL, Spring Data JPA/Hibernate, Flyway |
| Validação e contratos | Bean Validation e OpenAPI/Swagger |
| Qualidade | JUnit, Mockito e Testcontainers |
| Monitoramento | Spring Boot Actuator e logs estruturados |

A versão exata de Java e Spring Boot será fixada na Etapa 2, junto ao ambiente de hospedagem e à compatibilidade das dependências. O frontend continuará publicável de maneira independente no Netlify.

## Organização prevista

```text
backend/
├── pom.xml                      # Maven (Etapa 2)
├── src/main/java/.../           # Aplicação e módulos de negócio
│   ├── identity/                # Identidade, sessão e permissões
│   ├── accounts/                # Contas e titularidade
│   ├── transfers/               # Transferências e lançamentos
│   ├── payments/                # Pagamentos demonstrativos
│   └── audit/                   # Auditoria de operações
├── src/main/resources/          # Configuração e migrações Flyway
└── src/test/                    # Testes unitários e de integração
```

A árvore acima é um **desenho de referência**, não uma listagem de arquivos já existentes. Os módulos serão introduzidos quando sua funcionalidade for implementada.

## Integração com o Angular

A comunicação futura será realizada por endpoints REST em JSON e HTTPS. O backend será a fonte de verdade de contas, saldos, identidade e transações. O Angular continuará responsável por experiência, formulários e apresentação, sem decidir permissões nem atualizar saldos de maneira autônoma.

A introdução da API não bloqueará o frontend existente: primeiro validaremos a base Java (Etapa 2), depois persistência (Etapa 3), autenticação (Etapa 4) e os módulos financeiros subsequentes.

## Regras de implementação

- Nunca usar `double`/`float` para saldos ou valores monetários: utilizar `BigDecimal` com regras explícitas de escala e arredondamento.
- Aplicar transações de banco de dados para operações financeiras e prevenir execução duplicada ou concorrente.
- Evitar gravações parciais: uma operação deve ser integralmente confirmada ou revertida.
- Nunca confiar no perfil ou no identificador de conta enviado pelo cliente sem autorização no servidor.
- Não expor senhas, tokens, hashes, documentos pessoais ou dados sensíveis em respostas de erro e logs.
- Não alterar migrações Flyway já aplicadas; publicar novas versões para cada evolução do esquema.
- Usar bancos descartáveis para testes; produção e testes nunca devem compartilhar credenciais.

## Próxima entrega

A **Etapa 2** criará a estrutura Maven/Spring Boot, módulos iniciais, documentação OpenAPI, tratamento de erros, testes básicos e endpoint de saúde, seguida da configuração de publicação do backend. Os endpoints de cadastro, contas e transferência só serão implementados nas etapas previstas no [roadmap](../docs/ROADMAP.md).

A documentação de como executar o serviço e suas variáveis de ambiente será incluída quando o código Java existir, para não apresentar instruções fictícias como disponíveis.

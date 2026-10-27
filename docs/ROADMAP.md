# Roadmap do Monavero

O desenvolvimento será incremental. Cada etapa precisa de código revisado, documentação atualizada, testes aplicáveis e validação em nuvem antes de ser considerada concluída. Funcionalidades descritas aqui são **planejadas** e não devem ser interpretadas como prontas.

| Etapa | Escopo | Situação |
| --- | --- | --- |
| 0 | Versão inicial Angular, GitHub e primeiro deploy Netlify | Base publicada no GitHub; validação do deploy pendente |
| 1 | Monorepositório, base Angular, CI e testes | Implementação entregue; validação automatizada e deploy pendentes |
| 2 | API Java/Spring Boot com módulos, OpenAPI e endpoint de saúde | Planejada |
| 3 | PostgreSQL, JPA, Flyway e modelo de domínio bancário | Planejada |
| 4 | Cadastro, login, sessões e permissões verificadas no backend | Planejada |
| 5 | Contas, saldos, dashboard e extrato persistidos | Planejada |
| 6 | Transferências internas consistentes, idempotentes e concorrentes | Planejada |
| 7 | Agendamento confiável de transferências | Planejada |
| 8 | Pagamentos e agendamentos demonstrativos persistidos | Planejada |
| 9 | Administração, perfis e auditoria de operações | Planejada |
| 10 | Notificações, perfil e módulos complementares integrados | Planejada |
| 11 | Segurança, testes de integração, CI e observabilidade ampliados | Planejada |
| 12 | Revisão geral, documentação completa e release 1.0 | Planejada |

## Critérios de conclusão

- **Etapa 0:** acesso à aplicação, navegação, login demonstrativo e rotas internas verificados no Netlify.
- **Etapa 1:** Angular compila, testes unitários passam no CI, estrutura de pastas é válida e o deploy pelo novo caminho funciona.
- **Etapa 2:** serviço Java publicado, health check e documentação OpenAPI acessíveis, projeto organizado em módulos sem quebra da interface.
- **Etapa 3:** migrações do esquema reproduzíveis e persistência confiável após reinicialização.
- **Etapa 4:** cadastro/login/logout/relogin e autorização por titularidade/perfil validados no backend.
- **Etapa 5:** dashboard e extrato derivados de dados do banco, isolados por usuário.
- **Etapa 6:** transferências atômicas, sem gasto duplo ou duplicação, testadas com concorrência e falhas.
- **Etapa 7:** agendamentos disparados uma vez, com estados e cancelamento consistentes.
- **Etapa 8:** pagamentos de teste persistidos e processados com regras claras.
- **Etapa 9:** ações administrativas autorizadas, alterações críticas auditáveis sem dados sensíveis.
- **Etapa 10:** telas integradas e estados de notificação/perfil persistidos quando necessário.
- **Etapa 11:** cobertura dos fluxos críticos e automações estáveis no GitHub.
- **Etapa 12:** versionamento, documentação, testes e ambientes revisados para a release.

## Limites da demonstração

Não estão previstas movimentações financeiras reais, conexão a bancos, Pix real, cobrança verdadeira de boletos ou credenciamento como instituição financeira.

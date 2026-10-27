# Roadmap do Monavero

O Monavero evolui de um frontend Angular demonstrativo para um sistema full stack de simulação bancária. **Código entregue** não é o mesmo que **etapa validada**: a validação requer CI e, quando previsto, verificação no ambiente cloud.

| Etapa | Entrega | Situação em 27/10/2026 |
| --- | --- | --- |
| 0 | Frontend Angular inicial e publicação GitHub/Netlify | **Validada** — frontend publicado e navegação confirmada |
| 1 | Estrutura limpa, documentação por camada, CI e testes Angular | **Validada** — Frontend Angular CI #3 aprovado no GitHub |
| 2 | API Java/Spring Boot, módulos, contratos HTTP, testes e health | **Código preparado neste ZIP** — CI Java e publicação cloud pendentes |
| 3 | PostgreSQL, Spring Data JPA, modelo e migrações Flyway | Planejada |
| 4 | Autenticação própria, cadastro, sessão e autorização no servidor | Planejada |
| 5 | Contas, saldos, dashboard e extrato persistidos | Planejada |
| 6 | Transferências internas, lançamentos atômicos, idempotência e concorrência | Planejada |
| 7 | Agendamento seguro de transferências | Planejada |
| 8 | Pagamentos demonstrativos e agendamentos persistidos | Planejada |
| 9 | Administração, autorização e auditoria de operações | Planejada |
| 10 | Notificações, perfil e módulos complementares | Planejada |
| 11 | Testes integrados, segurança e observabilidade | Planejada |
| 12 | Revisão, documentação final, publicação e release 1.0 | Planejada |

## Critérios de conclusão

- **0:** frontend no Netlify, login demonstrativo e rotas internas funcionando.
- **1:** organização em `frontend/` e `backend/`; build e testes do Angular aprovados no Actions; deploy verificado.
- **2:** API Java compilada e testada no Actions; health check, identificação e documentação OpenAPI acessíveis em nuvem; Angular continua funcional.
- **3:** migrações reproduzíveis, conexão e dados persistidos no PostgreSQL de demonstração.
- **4:** cadastro, login, logout e novo login, além de autorização e isolamento por titularidade.
- **5:** dashboard, saldos e extrato refletindo dados persistidos e isolados por usuário.
- **6:** transferências atômicas, sem duplicação nem saldo inválido sob concorrência.
- **7:** agendamentos executados somente uma vez, com cancelamento e estados consistentes.
- **8:** pagamentos fictícios persistidos e com ciclo verificável.
- **9:** permissões efetivas e registros auditáveis de operações críticas.
- **10:** interfaces existentes integradas à API com comportamento consistente.
- **11:** bateria de testes e automações confiáveis, logs e monitoração adequados.
- **12:** fluxos ponta a ponta verificados, documentação e release final publicadas.

## Limites do produto

Monavero é demonstrativo. Não implementará Pix real, integração com instituições financeiras, compensação real de boletos ou movimentação de dinheiro de verdade.

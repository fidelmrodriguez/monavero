# Roadmap do Monavero

O Monavero evolui de um frontend Angular demonstrativo para um sistema full stack de simulação bancária. O status **entregue** indica código preparado; **validada** exige execução dos testes e verificação nos ambientes publicados.

| Etapa | Entrega | Status |
| --- | --- | --- |
| 0 | Frontend Angular inicial e publicação GitHub/Netlify | GitHub publicado; validação do Netlify pendente |
| 1 | Monorepositório limpo, documentação por camada, CI, testes e Netlify | Consolidação preparada; validação do CI e Netlify pendente |
| 2 | API Java/Spring Boot, módulos, documentação HTTP, endpoint de saúde | Planejada |
| 3 | PostgreSQL, Spring Data JPA e migrações Flyway | Planejada |
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

- **0:** app acessível no Netlify, login demonstrativo e rotas internas funcionando.
- **1:** não restam cópias Angular na raiz; build e testes aprovados no GitHub Actions; deploy Netlify validado.
- **2:** API Java com build e testes, health check e documentação HTTP acessíveis em nuvem, sem quebra do frontend.
- **3:** migrações reproduzíveis, conexão e persistência em banco de demonstração.
- **4:** cadastro, login, logout e novo login, além de autorização e isolamento por titularidade.
- **5:** dashboard, saldos e extrato refletem dados persistidos e isolados por usuário.
- **6:** transferências atômicas, sem duplicações nem saldo inválido sob concorrência.
- **7:** agendamentos disparados apenas uma vez, com cancelamento e estados consistentes.
- **8:** pagamentos fictícios persistidos e com ciclo de processamento verificável.
- **9:** permissões efetivas e registros auditáveis de operações críticas.
- **10:** telas existentes integradas à API com comportamento consistente.
- **11:** bateria de testes e automações confiáveis, logs e monitoração adequados.
- **12:** fluxos ponta a ponta verificados, documentação e release final publicadas.

## Limites do produto

Monavero é demonstrativo. Não implementará Pix real, integração com instituições financeiras, compensação real de boletos ou movimentação de dinheiro de verdade.

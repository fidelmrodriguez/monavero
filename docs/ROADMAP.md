# Roadmap do Monavero

O Monavero evolui de um frontend Angular demonstrativo para um sistema full stack de simulação bancária. **Código entregue** não é o mesmo que **etapa validada**: a validação requer CI e, quando previsto, verificação no ambiente cloud.

| Etapa | Entrega | Situação em 03/11/2026 |
| --- | --- | --- |
| 0 | Frontend Angular inicial e publicação GitHub/Netlify | **Validada** — frontend publicado e navegação confirmada |
| 1 | Estrutura limpa, documentação por camada, CI e testes Angular | **Validada** — Frontend Angular CI #3 aprovado no GitHub |
| 2 | API Java/Spring Boot, módulos, contratos HTTP, testes e health | **Validada** — API Blitz, Swagger, health e CI Java confirmados |
| 3 | PostgreSQL, Spring Data JPA, modelo e migrações Flyway | **Validada** — CI verde, Flyway V1 aplicada na Blitz, tabelas e histórico confirmados no Neon |
| 4 | Autenticação própria, cadastro, sessão e autorização no servidor | **Validada funcionalmente** — Spring Security, Flyway V3, login, logout e sessão entre abas |
| 5 | Contas, saldos, dashboard e extrato persistidos | **Validada** — saldos e extratos persistidos, testados após F5 |
| 6 | Transferências internas, lançamentos atômicos, idempotência e concorrência | **Validada** — transferências entre contas pessoais e demo com lançamentos persistidos |
| 7 | Agendamento seguro de transferências e remoção da integração externa legada | **Validada** — CI 2/2 verde, execução, cancelamento, saldo insuficiente, persistência e isolamento confirmados |
| 8 | Pagamentos demonstrativos imediatos e agendados, extrato e cancelamento | **Implementada — aguarda CI e validação no ambiente publicado** |
| 9 | Administração, autorização e auditoria de operações | Planejada |
| 10 | Notificações, perfil e módulos complementares | Planejada |
| 11 | Testes integrados, segurança e observabilidade | Planejada |
| 12 | Revisão, documentação final, publicação e release 1.0 | Planejada |

## Critérios de conclusão

- **0:** frontend no Netlify, login demonstrativo e rotas internas funcionando.
- **1:** organização em `frontend/` e `backend/`; build e testes do Angular aprovados no Actions; deploy verificado.
- **2:** API Java compilada e testada no Actions; health check, identificação e documentação OpenAPI acessíveis em nuvem; Angular continua funcional.
- **3:** migrações reproduzíveis, CI de persistência aprovado, tabelas criadas no Neon e API reiniciada com conexão saudável; sem exposição pública de dados sem autenticação.
- **4:** cadastro, login, logout com revogação e novo login; usuário demo; permissão atribuída no servidor. O isolamento de dados bancários fica para a Etapa 5.
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


### Atualização — Etapa 5

Implementação preparada: provisionamento de contas por usuário, movimentações persistidas no PostgreSQL (Flyway V4), isolamento pelo titular autenticado, dados demonstrativos separados de contas pessoais, integração Angular do dashboard/extrato, recuperação de indisponibilidade temporária da Blitz e navegação sem piscar o formulário. A etapa só deve ser marcada concluída após CI, migração e testes na Blitz/Netlify.

### Atualização — Etapa 6

Transferências **imediatas** entre contas Monavero, com validação de titularidade e saldo no servidor, travas PostgreSQL ordenadas, dois lançamentos simétricos em uma transação de banco, chave de idempotência e Flyway V5. A identidade demo possui duas contas fictícias e só pode transferir entre elas. Não há PIX/TED externo nem agendamento antecipado (Etapa 7). **Validação concluída:** transferência e extratos de dois titulares confirmados na interface e nos pipelines.

### Complemento da Etapa 6 — contas pessoais de titulares distintos

Antes da Etapa 7, as transferências internas passam a ser testáveis entre dois cadastros pessoais diferentes. O Flyway V6 inclui marcador persistente para **crédito de abertura fictício e único** de R$ 1.000,00 por conta pessoal nova ou preexistente sem saldo/movimentações, com lançamento próprio em extrato. Contas com histórico não recebem crédito retroativo. Não existe recarga pública. O teste integrado verifica transferência A → B, saldos finais, idempotência, isolamento dos extratos e bloqueio de operações com a identidade demonstrativa pública. **Validação concluída:** CI e testes ponta a ponta confirmados, com saldos persistidos após F5.

### Atualização — Etapa 7

Implementadas transferências agendadas com ciclo `agendado → concluido/recusado` ou `agendado → cancelado`, API autenticada, chave idempotente, persistência Flyway V7, bloqueio concorrente e execução no backend. Nenhuma cobrança ou débito ocorre na criação. O executor retoma agendamentos vencidos após o início da aplicação; na Blitz gratuita a execução não pode ser garantida durante o período em que a API permanece dormindo. Removidas todas as referências e chamadas remanescentes ao provedor externo de dados fictícios, inclusive na árvore Angular histórica da raiz; o frontend publicado utiliza somente a API própria. **CI e fluxos principais validados em 03/11/2026.**

### Entrega — Etapa 8 (aguarda validação)

- Pagamentos demonstrativos imediatos e agendados por conta autenticada, com tipos boleto e convênio **sem liquidação externa**.
- Registros em `bank_payments` (Flyway V8), histórico isolado, cancelamento de pendentes, idempotência e lançamento `PAGAMENTO` no extrato.
- Débito imediato atômico; agendados debitam somente no vencimento, com bloqueio `FOR UPDATE SKIP LOCKED` e tentativa de recuperação após o retorno da Blitz.
- Operações sem saldo ficam recusadas sem saldo negativo. Diagnósticos `[Monavero][Teste E8]` exclusivamente no console.
- **Pendente:** GitHub Actions Java/Angular, confirmação Flyway V8 na Blitz e teste funcional da tela publicada.

## Atualização da Etapa 9

Gestão administrativa, autorização por perfil real e auditoria persistente implementadas. CI e validação em produção pendentes. Consulte ADMINISTRACAO.md para escopo e testes.

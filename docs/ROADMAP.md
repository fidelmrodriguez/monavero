# Roadmap do Monavero

O Monavero evolui de um frontend Angular demonstrativo para um sistema full stack de simulação bancária. **Código entregue** não é o mesmo que **etapa validada**: a validação requer CI e, quando previsto, verificação no ambiente cloud.

| Etapa | Entrega | Situação do candidato ao release 1.0.0 |
| --- | --- | --- |
| 0 | Frontend Angular inicial e publicação GitHub/Netlify | **Validada** — frontend publicado e navegação confirmada |
| 1 | Estrutura limpa, documentação por camada, CI e testes Angular | **Validada** — Frontend Angular CI #3 aprovado no GitHub |
| 2 | API Java/Spring Boot, módulos, contratos HTTP, testes e health | **Validada** — API Blitz, Swagger, health e CI Java confirmados |
| 3 | PostgreSQL, Spring Data JPA, modelo e migrações Flyway | **Validada** — CI verde, Flyway V1 aplicada na Blitz, tabelas e histórico confirmados no Neon |
| 4 | Autenticação própria, cadastro, sessão e autorização no servidor | **Validada funcionalmente** — Spring Security, Flyway V3, login, logout e sessão entre abas |
| 5 | Contas, saldos, dashboard e extrato persistidos | **Validada** — saldos e extratos persistidos, testados após F5 |
| 6 | Transferências internas, lançamentos atômicos, idempotência e concorrência | **Validada** — transferências entre contas pessoais e demo com lançamentos persistidos |
| 7 | Agendamento seguro de transferências e remoção da integração externa legada | **Validada** — CI 2/2 verde, execução, cancelamento, saldo insuficiente, persistência e isolamento confirmados |
| 8 | Pagamentos demonstrativos imediatos e agendados, extrato e cancelamento | **Fluxos principais validados** |
| 9 | Administração, autorização e auditoria de operações | **Implementada; CI aprovado; validação no site pendente** |
| 10 | Notificações, cartões demonstrativos e perfil | **Implementada; CI informado como aprovado; revisão funcional do site pendente** |
| 11 | Testes integrados, segurança e observabilidade | **Implementada em código; revalidação do CI pendente** |
| 12 | Revisão, documentação final, publicação e release 1.0 | **Candidato 1.0.0 preparado; publicação depende da aceitação e da tag** |

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

### Etapa 8 — fluxos principais validados

- Pagamentos demonstrativos imediatos e agendados por conta autenticada, com tipos boleto e convênio **sem liquidação externa**.
- Registros em `bank_payments` (Flyway V8), histórico isolado, cancelamento de pendentes, idempotência e lançamento `PAGAMENTO` no extrato.
- Débito imediato atômico; agendados debitam somente no vencimento, com bloqueio `FOR UPDATE SKIP LOCKED` e tentativa de recuperação após o retorno da Blitz.
- Operações sem saldo ficam recusadas sem saldo negativo. Diagnósticos `[Monavero][Teste E8]` exclusivamente no console.
- **Situação:** fluxos principais de pagamento validados; demais evidências de testes devem ser acompanhadas no CI e no ambiente publicado.

## Atualização da Etapa 9

Gestão administrativa, acesso administrativo exclusivo do guest e auditoria persistente implementadas. CI aprovado; validação no site publicado pendente. Consulte [Administração](ADMINISTRACAO.md) para escopo e testes.


### Entrega — Etapa 10 (aguarda validação funcional completa)

- Central de notificações persistentes por titular, marcadores de leitura e avisos de operações confirmadas sem fixtures locais.
- Cartões virtuais estritamente fictícios com criação, bloqueio, desbloqueio, cancelamento e limite de três não cancelados por conta.
- Perfil pessoal com atualização de nome, alteração de senha com revogação de sessões e encerramento seletivo de outras sessões.
- Perfil demo compartilhado impede alterações de dados ou gestão de sessões.
- Flyway V10 e testes da API/UI adicionados. CI Angular aprovado segundo o retorno de validação; confirmar também o deploy do backend, a migração no ambiente remoto e os testes funcionais.

### Etapas 11 e 12 — candidato ao release

- Proteção de respostas da API contra cache, ID de correlação por requisição e logs reduzidos de erros/latência sem registrar credenciais ou corpo HTTP.
- Headers básicos de proteção no Netlify, preservando o deploy estático Angular.
- Testes unitários do filtro HTTP e teste integrado que valida persistência entre logins e isolamento dos dados de cartões/notificações.
- Versão `1.0.0` nos dois módulos; workflow para publicar o release no GitHub **somente após** os testes automatizados dessa tag serem aprovados.
- **Pendente de validação:** CI completo do novo commit, backend publicado, Flyway V10 ativo e checklist real do site. Só então enviar a tag `v1.0.0` e concluir a Etapa 12.

Não há nova migração após V10 nem dados bancários reais.

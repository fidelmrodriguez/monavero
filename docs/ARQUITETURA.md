# Arquitetura do Monavero

O Monavero separa a experiência do cliente, as regras financeiras do servidor e a persistência em banco. É um sistema demonstrativo; não há integração com infraestrutura bancária real.

## Visão geral

```text
Navegador
   │ HTTPS
   ▼
Netlify — Angular 19 SPA estática
   │
   ├── /api/monavero-readiness ──► proxy Netlify ──► Blitz /actuator/health
   │
   └── HTTPS + sessão opaca ───────────────────────► Blitz /api/v1/*
                                                      │
                                                      ▼
                                           Spring Boot 4.1.1 / Java 25
                                           ├── autenticação e sessões
                                           ├── contas e extrato
                                           └── transferências internas
                                                      │
                                                      ▼
                                           PostgreSQL 18 / Neon
                                           └── Flyway V1 a V5
```

O Angular não possui credenciais do banco, não aplica autorização financeira definitiva e não decide saldos. O backend autentica o solicitante, verifica titularidade, calcula regras de negócio e persiste transações.

## Frontend

- Componentes Angular standalone, Signals, RxJS e Reactive Forms.
- Páginas sob demanda para dashboard, extrato, transferências e outras funcionalidades.
- Autenticação pelo backend com sessão revogável; o perfil visual da demonstração não concede privilégios.
- Contas, saldos e lançamentos consultados na API. Cartões, investimentos e parte dos pagamentos/notificações permanecem como dados locais de apresentação.
- Publicação SPA estática no Netlify, sem Angular SSR. A rota de readiness usa um proxy; o fallback SPA atende apenas às demais rotas.
- Logs de diagnóstico ficam no console do navegador e não exibem credenciais, tokens ou número completo de conta.

## Backend

- Java 25 + Spring Boot 4.1.1, com Spring Security, Spring Data JPA e módulos organizados por domínio.
- API de autenticação e sessões, consulta bancária e transferência entre contas Monavero.
- Validação de titularidade, saldo, situação de contas e limite por operação no servidor.
- Transferências com atomicidade, ordenação de bloqueios e chave de idempotência para reenvios.
- Actuator para disponibilidade e OpenAPI para documentação de endpoints.

## Banco e migrações

- PostgreSQL 18 no Neon, com migrações Flyway versionadas e validadas em inicialização.
- V1: identidades, contas e titularidades.
- V2–V3: autenticação, sessões e alinhamento do esquema.
- V4: lançamentos de contas e dados persistidos de demonstração.
- V5: transferências internas, referência de transferência e restrições de integridade.
- Banco isolado em Testcontainers para testes de integração; não compartilhar credenciais de produção com CI.

## Recuperação de indisponibilidade

O serviço backend hospedado na Blitz pode passar por inicialização a frio. O frontend consulta readiness antes de iniciar os fluxos autenticados. A resposta só é considerada pronta quando o health check informa `UP`. O proxy Netlify não substitui o backend e não garante o despertar automático em todos os estados da hospedagem.

## Limites explícitos

PIX/TED externos, boletos reais e liquidação de valores não fazem parte desta implementação. Transferências agendadas estão implementadas na Etapa 7. Pagamentos demonstrativos persistidos, agendamento de pagamentos e evolução de auditoria/administração permanecem no [roadmap](ROADMAP.md).

Veja também [funcionalidades](FUNCIONALIDADES.md), [segurança](SEGURANCA_AUTENTICACAO.md) e [testes](TESTES.md).


## Execução de transferências agendadas (Etapa 7)

O frontend envia os dados para a API autenticada; a tabela `scheduled_transfers` mantém a intenção de transferência até o vencimento. O serviço `ScheduledTransferWorker` consulta agendamentos vencidos; `ScheduledTransferExecutionService` trava cada agendamento com `FOR UPDATE SKIP LOCKED` e utiliza `TransferService` para as mesmas validações de titularidade, status, saldo, limite, idempotência e gravação atômica de dois lançamentos. Uma execução concluída é associada ao agendamento, e nenhuma tentativa de execução ocorre no navegador. Um scheduler executa somente enquanto o backend está online; agendamentos atrasados são recuperados na próxima ativação da aplicação.

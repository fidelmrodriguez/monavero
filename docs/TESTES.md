# Testes e critérios de aceitação

O Monavero executa testes automatizados no GitHub Actions e precisa de uma validação funcional no ambiente publicado. Não use dados bancários nem senhas reais na demonstração.

## Testes automatizados

### Frontend (Angular)

Requer Node.js 22 e Chrome/Chromium para o Karma:

```bash
cd frontend
npm install --no-audit --no-fund
npm run typecheck
npm run build
npm test
```

Os testes Jasmine/Karma cobrem autenticação, guards, interface por perfil, formulários, serviços HTTP, pagamentos, transferências, agendamentos, notificações, cartões e estados de erro. O workflow correspondente é `.github/workflows/frontend-ci.yml`.

### Backend (Spring Boot)

Requer Java 25, Maven e Docker para Testcontainers/PostgreSQL:

```bash
cd backend
mvn -B -ntp clean verify
```

Os testes Java verificam autenticação e revogação de sessão, titularidade e isolamento, transferências atômicas e idempotentes, pagamentos e agendamentos, cartões, notificações, administração e auditoria. O workflow está em `.github/workflows/backend-ci.yml`. Os testes com Testcontainers não devem usar as credenciais do banco de produção.

## Verificação no ambiente publicado

### Autenticação e perfis

- Criar duas contas pessoais diferentes, sair e voltar a entrar; F5 não deve exibir dados de outro usuário.
- Após logout, o token antigo deve receber `401` na API.
- Entrar no acesso demonstrativo `User / 1234` como **Cliente**, **Gerente** e **Administrador**; cada sessão deve exibir o título, a sidebar e o dashboard do papel selecionado.
- Cliente não deve ver Administração ou Auditoria; gerente deve consultar Administração **sem editar** e não deve acessar Auditoria; administrador deve poder usar ambas.
- Testar URLs diretas e chamadas à API: a autorização não pode depender de ocultar itens do menu. Contas pessoais não recebem poderes administrativos pela seleção visual.

### Operações bancárias

- Conferir saldo e extrato, incluindo a persistência após F5.
- Efetuar transferência entre contas autorizadas: débito e crédito devem ser refletidos nos respectivos extratos, sem duplicação ao reenviar a mesma chave idempotente.
- Tentar transferir com saldo insuficiente ou conta de origem de outro titular: a API deve recusar.
- Agendar e cancelar uma transferência pendente; conferir processamento/recusa quando atingir o horário.
- Registrar pagamento demonstrativo imediato ou agendado; confirmar débito único, histórico e cancelamento apenas enquanto pendente.

### Notificações, cartões e perfil

- Gerar uma notificação por operação confirmada, abrir o sino, confirmar que o indicador de não lidas desaparece e que o histórico permanece após F5.
- Criar, bloquear, desbloquear e cancelar cartão virtual demonstrativo; cartão cancelado não pode ser reativado.
- Conferir limite de cartões por titular e que outro usuário não enxerga os cartões ou notificações alheios.
- Em conta pessoal, atualizar nome, trocar senha e verificar invalidação das sessões antigas; conferir a funcionalidade de encerramento das outras sessões.

### Segurança, saúde e observabilidade

- `GET /actuator/health` retorna `UP` com serviço e banco disponíveis; Swagger apresenta os endpoints efetivamente publicados.
- Respostas `/api/**` devem conter `Cache-Control: no-store` e um `X-Request-Id` próprio.
- Verificar CORS apenas para as origens autorizadas e ausência de tokens, senhas e números completos de conta nos logs.
- Confirmar aplicação bem-sucedida das migrações Flyway e ausência de divergência de esquema Hibernate.

## Diagnósticos

Os eventos estruturados do navegador possuem prefixos funcionais como `[Monavero][auth]`, `[Monavero][accounts]`, `[Monavero][transfers]`, `[Monavero][scheduling]`, `[Monavero][payments]` e `[Monavero][admin]`. Eles ficam no DevTools, não na interface. Compartilhe apenas mensagens técnicas sem credenciais ou dados pessoais.

Os agendamentos são executados somente quando o backend está ativo. Na hospedagem gratuita sob demanda, um vencimento pode ser processado após a próxima ativação do serviço.

## Publicação de versão

O workflow `.github/workflows/release.yml` verifica novamente frontend e backend antes de criar uma publicação do GitHub a partir de uma tag. Só envie a tag depois da aprovação dos pipelines e dos cenários funcionais no site. O GitHub Release não substitui o deploy do Netlify ou da Blitz.

# Administração e auditoria

A Etapa 9 usa os perfis persistidos em app_users. A migração V9 cria o histórico
administrativo e a versão usada para detectar edições concorrentes.

| Perfil | Administração | Auditoria |
| --- | --- | --- |
| Cliente | Sem acesso | Sem acesso |
| Gerente | Sem acesso | Consulta |
| Administrador | Consulta e alteração de perfil/status | Consulta |

O acesso público de demonstração recebe ADMIN diretamente do servidor.
As APIs verificam a autorização em cada requisição. Alterações exigem motivo,
são transacionais e encerram todas as sessões do usuário alterado. O usuário
deve entrar novamente após mudança de perfil ou desbloqueio.

A própria conta e a conta de demonstração não podem ser editadas pela tela.
O serviço serializa alterações administrativas, verifica a versão do registro
e impede a remoção do último administrador ativo. Repetir uma alteração já
aplicada com o mesmo estado final não cria outro evento.

## Acesso público de avaliação

Qualquer visitante pode entrar com User / 1234 na tela de login.
A API emite uma sessão real ADMIN para a conta pública de demonstração.
A inicialização atualiza também a conta demo criada em versões anteriores.

Nenhuma configuração de e-mail é necessária na Blitz. A variável
MONAVERO_INITIAL_ADMIN_EMAIL das entregas anteriores deixa de ser utilizada.
Caso ela tenha sido cadastrada, pode ser removida.

A demonstração permite consultar todos os usuários e as contas com titular,
agência, número, status e saldo, alterar perfis e status de usuários e consultar
a auditoria. Essas alterações são compartilhadas entre avaliadores e persistem
no banco. A conta demo é protegida contra edição para manter o acesso público.

Contas pessoais continuam recebendo CLIENT no cadastro. Os perfis persistidos
determinam as permissões dessas sessões. A consulta administrativa das contas
não troca a sessão do visitante para a identidade de outro titular.

## API

- GET /api/v1/admin/users?page=0
- GET /api/v1/admin/accounts?page=0
- PATCH /api/v1/admin/users/{id}
- GET /api/v1/audit/events?page=0

A listagem retorna até 51 registros. A interface mostra 50 e usa o registro
adicional para indicar a próxima página. A alteração recebe role, status,
version e reason. Perfil e status aceitam somente os enums do domínio.
Conflitos de versão ou regras administrativas retornam 409.

A auditoria registra responsável, usuário afetado, perfis e status anteriores
e posteriores, motivo e data. Os eventos administrativos ficam no PostgreSQL
e continuam disponíveis após recarregar ou trocar de sessão. Não há endpoint
para apagar ou editar eventos. A trilha desta etapa cobre alterações
administrativas de usuários.

## Validação funcional

1. Como administrador, abrir a lista e alterar uma segunda conta de Cliente
   para Gerente, informando motivo.
2. Na segunda conta, entrar novamente e conferir acesso à Auditoria e ausência
   de acesso à Administração.
3. Bloquear a segunda conta, conferir encerramento da sessão no próximo acesso
   à API e recusa de novo login.
4. Desbloquear, entrar novamente e conferir recuperação do acesso.
5. Conferir eventos, motivos e estados anteriores/posteriores na Auditoria após F5.
6. Confirmar que uma conta Cliente não abre as rotas administrativas nem acessa
   as APIs protegidas. A entrada pública User / 1234 permite avaliar a administração.
7. Em duas abas administrativas, tentar salvar estados diferentes sobre a mesma
   versão e conferir o aviso de conflito na segunda alteração.

Os testes AdminIntegrationTest cobrem autorização por perfil, bloqueio,
revogação, desbloqueio, conflito de versão, autoalteração e ausência de evento
duplicado em retry. A execução completa requer Maven, Java 25 e Docker.

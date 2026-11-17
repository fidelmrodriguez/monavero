# Administração e auditoria

Ferramentas disponíveis exclusivamente no acesso demonstrativo `User / 1234`,
com autorização por **papel da sessão** verificado pela API, sem promoção de contas pessoais.
O cliente não acessa a gestão. O gerente consulta usuários, contas e indicadores em modo
somente leitura. O administrador também pode alterar o status de acesso e consultar auditoria.

**Menu:** Gestão de usuários aparece na sidebar e no menu superior para Gerente e
Administrador; Auditoria aparece somente para Administrador. Os links são ocultados por
perfil, mas a autorização é repetida no servidor; URLs diretas e requisições HTTP não
contornam as permissões. O perfil vem da API na criação da sessão, e não de um rótulo
visual editável. A migração V11 adiciona `auth_sessions.demo_role`.

GET `/api/v1/admin/summary` fornece indicadores agregados de usuários pessoais,
contas e auditoria (os totais não são simulados nem calculados apenas da página atual).

## Usuários e contas

A tabela única lista usuários de login e todas as contas vinculadas a cada um,
incluindo vínculos secundários. Usuários sem conta aparecem com “Sem conta vinculada”.
O fluxo bancário cria a conta no primeiro acesso ao painel; cadastrar um usuário
não significa que ele já possui conta bancária. Consultar a administração não cria
contas nem modifica saldos. A paginação é por usuário, com até 50 usuários por página.
GET /api/v1/admin/users?page=0 retorna até 51 usuários, cada um com accounts.
O registro adicional indica a próxima página; as contas de cada usuário não são truncadas.

## Alterações e auditoria

PATCH /api/v1/admin/users/{id} recebe apenas status, version e reason. O perfil persistido é preservado.
O painel permite bloquear/desbloquear acesso, sem mudar tipos de usuário.
Alterações exigem motivo, revogam sessões do usuário afetado e geram auditoria persistente.
A própria conta guest não pode ser alterada. Versões conflitantes retornam 409.
Repetir uma alteração já aplicada não duplica eventos.
GET /api/v1/audit/events?page=0 consulta os eventos. GET /api/v1/admin/accounts
permanece disponível para gerente e administrador demo em modo consulta.
Nenhuma variável MONAVERO_INITIAL_ADMIN_EMAIL é necessária.

## Testes após deploy

1. Entrar com `User / 1234` como Cliente: sidebar e dashboard financeiros, sem Gestão de usuários e Auditoria; URLs e APIs de gestão retornam acesso negado.
2. Entrar como Gerente: sidebar identifica "Gerente", dashboard de acompanhamento com indicadores reais, Gestão de usuários disponível somente para consulta; PATCH e Auditoria negados.
3. Entrar como Administrador: sidebar identifica "Administrador", dashboard de governança, Gestão de usuários com edição e Auditoria disponível.
4. Atualizar com F5 e confirmar que o papel não muda; sair e entrar com outro papel e confirmar mudança de permissões.
5. Testar conta pessoal: sem gestão, mesmo que seu papel persistido seja MANAGER/ADMIN.
6. Verificar CI e Flyway V11 na Blitz antes de considerar a alteração validada.

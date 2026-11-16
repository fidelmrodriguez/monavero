# Administração e auditoria

Ferramentas exclusivas da conta guest (User / 1234), identificada por is_demo
na API. Nenhuma conta pessoal, mesmo com papel ADMIN ou MANAGER, pode acessar.
O seletor Cliente / Gerente / Administrador no login escolhe a apresentação da
demonstração; não promove contas pessoais nem exige alterar perfis depois de entrar.

Administração e Auditoria ficam no menu do usuário, abaixo de Perfil.
Não aparecem na navegação lateral. As rotas e a API também verificam a restrição.

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
permanece disponível por compatibilidade, também exclusivo do guest.
Nenhuma variável MONAVERO_INITIAL_ADMIN_EMAIL é necessária.

## Testes após deploy

1. Entrar com User / 1234 escolhendo cada tipo de usuário no login.
2. Abrir o menu do topo: Perfil, Administração e Auditoria; conferir ausência dos dois últimos na lateral.
3. Conferir a tabela única, usuários sem conta, contas com saldo zero e múltiplos vínculos do guest.
4. Alterar uma conta de teste com motivo, conferir o evento na Auditoria e a persistência após F5.
5. Entrar com conta pessoal: não deve ver os itens nem acessar /app/administracao ou /app/auditoria.
   Repetir com conta pessoal marcada ADMIN ou MANAGER; chamadas diretas às APIs devem retornar 403.
6. Bloquear/desbloquear uma conta de teste e conferir revogação de sessão e novo login.

Os testes automatizados cobrem guest, negativas de contas pessoais, vínculos,
ausência de conta, revogação, concorrência e retries. Backend requer Java 25,
Maven e PostgreSQL de teste via Docker; frontend requer dependências npm e Chrome.

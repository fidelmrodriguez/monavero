# Segurança e autenticação — Monavero

## Modelo da Etapa 4

- Cadastro pessoal em `POST /api/v1/auth/register`: nome, e-mail e senha de 12–72 caracteres (máximo de 72 bytes UTF-8 por limite do BCrypt). O backend normaliza e-mail, verifica unicidade e atribui exclusivamente `CLIENT`.
- Login em `/login`: verificação BCrypt e resposta genérica 401 para dados inexistentes ou senha incorreta.
- Demo em `/demo`: conta especial criada no backend (sem senha reutilizável); acesso público para avaliação, com papel `CLIENT`, habilitado por padrão. Desabilitar em produção não demonstrativa com `MONAVERO_DEMO_ENABLED=false`.
- Cada login recebe token Bearer opaco aleatório de 32 bytes e expiração em 12h. `auth_sessions` persiste apenas SHA-256, vencimento e revogação. A cada chamada autenticada o Spring Security valida sessão, usuário ativo e papel.
- `GET /me` e `POST /logout` exigem token. O logout revoga a sessão no banco. Ao receber resposta de sessão inválida, o Angular remove a sessão local.
- O login demonstrativo permite escolher Cliente, Gerente ou Administrador com o mesmo atalho `User` / `1234`, exclusivamente para **pré-visualizar as telas simuladas**. O papel real do demo na API permanece `CLIENT`, sem elevação de acesso. O seletor não participa do cadastro pessoal nem das credenciais enviadas ao backend. Guards do Angular protegem a experiência visual, mas não servem como autorização de API; endpoints REST devem verificar titularidade e papéis no Java.

## Limitações assumidas e próximos controles

- `sessionStorage` conserva o token apenas na aba atual. Para sincronizar abas abertas na mesma origem Angular, `BroadcastChannel` transmite a sessão apenas entre abas em execução; uma nova aba aguarda até 500 ms pela resposta e valida a sessão no backend antes de entrar em rotas protegidas. O logout é propagado apenas às abas que utilizam o mesmo token, sem prometer revogação global de dispositivos. **O token nunca é persistido em `localStorage` para essa sincronização.** Se não existir outra aba ativa ou suporte ao canal, a nova aba pede login. Scripts maliciosos na origem Angular ainda podem ler o token; CSP estrita, revisão de dependências e proteção contra XSS serão reforçadas na Etapa 11.
- O endpoint demo é público: pode gerar sessões em massa. Limitação de taxa por origem/conta, limpeza de sessões expiradas, monitoramento de abuso e antifraude demonstrativo serão tratados antes de considerar o sistema preparado para tráfego não controlado.
- Esta é uma aplicação **educacional/demonstrativa**, sem dinheiro real. Ainda não há recuperação de senha, MFA, verificação de e-mail, revogação global de sessões ou bloqueio progressivo de tentativas.
- Os dados financeiros apresentados pelo Angular ainda são fictícios e não pertencem ao usuário cadastrado. Isolamento real por titularidade começa na Etapa 5.
- Nunca versionar senhas reais, tokens ou credenciais. Manter Neon sob TLS, limitar logs de cabeçalhos Authorization e verificar o CORS da Blitz.

## Validar na publicação

1. Confirmar migrations `V1` e `V2`, `Backend Java CI` e `Frontend Angular CI` aprovados.
2. Cadastro → logout → login com mesma conta → F5 mantendo a sessão.
3. Logout invalida a sessão no servidor; token antigo deve retornar 401 em `/me`.
4. Senha incorreta retorna 401; cadastro com e-mail repetido retorna 409.
5. Atalho `User`/`1234` deve exibir Cliente, Gerente e Administrador no seletor visual, sem elevar o papel `CLIENT` na API nem permitir cadastro público de administradores.
6. Selecionar Administrador no demo → navegar em Administração/Auditoria → atualizar (F5) e abrir outra aba: a visualização persiste, mas `GET /me` deve continuar retornando `CLIENT`.
7. Usar credenciais pessoais com o seletor em Administrador: o backend deve continuar determinando o papel real, sem qualquer elevação.

## Verificação de sincronização entre abas

1. Entrar no demo na aba A, abrir a mesma origem do Monavero na aba B e confirmar que ambas entram sem repetir o login.
2. Atualizar a aba B (F5) e confirmar que a sessão continua válida.
3. Sair na aba A; a aba B deve retornar à tela de login sem aceitar o token revogado.
4. Se o usuário entrar novamente, confirmar que as abas abertas recebem a nova sessão.
5. O teste automatizado `AuthStore entre abas` cobre troca de sessão, logout e resposta tardia de `/me`.

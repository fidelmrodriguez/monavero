# Segurança e autenticação — Monavero

## Modelo da Etapa 4

- Cadastro pessoal em `POST /api/v1/auth/register`: nome, e-mail e senha de 12–72 caracteres (máximo de 72 bytes UTF-8 por limite do BCrypt). O backend normaliza e-mail, verifica unicidade e atribui exclusivamente `CLIENT`.
- Login em `/login`: verificação BCrypt e resposta genérica 401 para dados inexistentes ou senha incorreta.
- Demo em `/demo`: conta especial criada no backend (sem senha reutilizável); acesso público para avaliação, com papel `CLIENT`, habilitado por padrão. Desabilitar em produção não demonstrativa com `MONAVERO_DEMO_ENABLED=false`.
- Cada login recebe token Bearer opaco aleatório de 32 bytes e expiração em 12h. `auth_sessions` persiste apenas SHA-256, vencimento e revogação. A cada chamada autenticada o Spring Security valida sessão, usuário ativo e papel.
- `GET /me` e `POST /logout` exigem token. O logout revoga a sessão no banco. Ao receber resposta de sessão inválida, o Angular remove a sessão local.
- Os perfis não são selecionáveis no frontend. A interface nunca concede permissões a si própria; novas rotas REST deverão sempre verificar titularidade e autorização no Java.

## Limitações assumidas e próximos controles

- `sessionStorage` evita persistência indefinida e funciona com Netlify + Blitz em domínios distintos, mas qualquer script malicioso executado na origem Angular poderia ler o token. Adoção de CSP estrita, revisão de dependências e proteção contra XSS serão reforçadas na Etapa 11.
- O endpoint demo é público: pode gerar sessões em massa. Limitação de taxa por origem/conta, limpeza de sessões expiradas, monitoramento de abuso e antifraude demonstrativo serão tratados antes de considerar o sistema preparado para tráfego não controlado.
- Esta é uma aplicação **educacional/demonstrativa**, sem dinheiro real. Ainda não há recuperação de senha, MFA, verificação de e-mail, revogação global de sessões ou bloqueio progressivo de tentativas.
- Os dados financeiros apresentados pelo Angular ainda são fictícios e não pertencem ao usuário cadastrado. Isolamento real por titularidade começa na Etapa 5.
- Nunca versionar senhas reais, tokens ou credenciais. Manter Neon sob TLS, limitar logs de cabeçalhos Authorization e verificar o CORS da Blitz.

## Validar na publicação

1. Confirmar migrations `V1` e `V2`, `Backend Java CI` e `Frontend Angular CI` aprovados.
2. Cadastro → logout → login com mesma conta → F5 mantendo a sessão.
3. Logout invalida a sessão no servidor; token antigo deve retornar 401 em `/me`.
4. Senha incorreta retorna 401; cadastro com e-mail repetido retorna 409.
5. Atalho `User`/`1234` deve criar sessão demonstrativa de cliente, sem permitir elevar privilégio pelo formulário.

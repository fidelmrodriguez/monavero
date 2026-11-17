# Segurança e autenticação — Monavero

## Modelo de autenticação e autorização

- Contas pessoais criadas em `POST /api/v1/auth/register` recebem exclusivamente a permissão `CLIENT`, nunca um papel fornecido pelo navegador. Senhas pessoais são protegidas com BCrypt.
- O login usa sessões Bearer opacas de 32 bytes, com expiração em 12 horas. O PostgreSQL armazena o hash SHA-256 do token, não o segredo em claro. Logout e troca de senha revogam sessões no servidor.
- API stateless com Spring Security, sem cookies de autenticação, com CORS restrito às origens configuradas em `MONAVERO_CORS_ALLOWED_ORIGINS`. A autenticação sozinha não autoriza acesso a registros de outro titular.
- O acesso compartilhado `User / 1234` é uma **identidade pública demonstrativa**: o papel de cada sessão é CLIENT, MANAGER ou ADMIN conforme a seleção no login demo. Esse papel é persistido em `auth_sessions.demo_role` (Flyway V11) e lido pelo backend em cada chamada. Os endpoints de gestão exigem `principal.demo()` e MANAGER/ADMIN para consulta; alterações e auditoria exigem ADMIN. Uma conta pessoal ADMIN não recebe acesso a essas ferramentas. Não hospedar esse acesso aberto junto com informações reais.
- O seletor de papel do acesso demo agora muda o papel da sessão no backend, e não apenas o visual. A conta demo não altera nome/senha nem gerencia as sessões compartilhadas dos visitantes.
- `sessionStorage` guarda o token apenas na aba; a sincronização com `BroadcastChannel` entre abas ativas não o persiste no `localStorage`. Scripts não confiáveis na origem ainda representam risco de XSS.
- Os dados de contas, lançamentos, transferências, pagamentos, cartões e notificações são isolados pela identidade autenticada no backend, conforme os testes integrados.

## Controles de segurança e observabilidade

- `RequestObservabilityFilter` gera um UUID novo em `X-Request-Id` por requisição e coloca o mesmo identificador no MDC para correlacionar logs; IDs enviados pelo cliente são ignorados.
- Todos os endpoints `/api/**`, inclusive login e dados bancários, enviam `Cache-Control: no-store` e `Pragma: no-cache`.
- Logs de requisições lentas (a partir de 5 s) ou respostas 5xx registram método, status e duração, sem incluir URL, query string, headers, corpo, token ou dados bancários.
- O Actuator publica apenas `health` e `info`; `/actuator/health` não expõe detalhes do banco. O Netlify envia headers conservadores de segurança do navegador.
- CI do backend executa testes de autorização, isolamento, fluxo integrado de sessão/cartão/notificação e filtros HTTP usando PostgreSQL em Testcontainers. CI do frontend executa TypeScript, build e testes Chrome Headless.

## Limites de segurança conhecidos

**Monavero é um sistema de demonstração, não uma plataforma bancária adequada a dados ou dinheiro reais.** Não há MFA, recuperação de senha, verificação de e-mail, rate limit distribuído por IP/conta, WAF, prevenção de abuso do login demo, limpeza periódica de sessões expiradas nem CSP estrita específica para todos os scripts do Angular. A hospedagem gratuita também não garante continuidade dos workers de agendamento. Evitar afirmar proteção contra ataques para a qual não existe implementação.

Nunca versionar segredos ou usar credenciais reais em capturas de tela, logs, tickets ou commits. Para desabilitar o acesso demo compartilhado, configurar `MONAVERO_DEMO_ENABLED=false` e revisar as funcionalidades que dependem dessa identidade pública.

## Checklist mínimo no ambiente publicado

- Cadastro pessoal, logout, login e F5; tentativa com token revogado retorna 401.
- Dois usuários distintos não acessam dados financeiros, notificações ou cartões um do outro.
- Perfil pessoal permite trocar nome e senha; sessão antiga deixa de funcionar após troca de senha.
- Administração e auditoria acessíveis somente na identidade demo; negar acesso em uma conta pessoal.
- Verificar `X-Request-Id` em chamadas HTTP e `Cache-Control: no-store` nos endpoints da API.
- Confirmar os dois workflows verdes e todas as migrações esperadas no ambiente publicado antes de publicar uma tag.

Os cenários de validação estão em [Testes](TESTES.md).

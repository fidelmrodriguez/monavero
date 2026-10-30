# Funcionalidades e limites do produto

O **Monavero** é um projeto de portfólio que demonstra a experiência de um banco digital. A interface segue padrões de produto voltado ao usuário final; o ambiente permanece **demonstrativo**, sem custódia ou movimentação de recursos reais.

## Funcionalidades implementadas

### Acesso e identidade

- Login e cadastro autenticados pela API Java (Spring Security), com senha protegida por BCrypt.
- Sessões opacas persistidas e revogáveis; logout e atualização da página preservam as regras de autenticação.
- Acesso de demonstração `User / 1234`; contas pessoais usam e-mail e senha próprios.
- A autorização do backend é independente de qualquer seletor visual de perfil.

### Contas e painel

- Contas por titular autenticado, com agência, número, tipo e saldo consultados no PostgreSQL (Neon).
- Painel com saldo consolidado, contas e movimentações recentes.
- Cartões e investimentos exibidos no acesso demonstrativo são dados de apresentação locais, ainda não persistidos.

### Extrato

- Lançamentos bancários registrados e consultados pela API Java, com filtros e pesquisa no Angular.
- As transferências internas geram lançamentos de débito e crédito na mesma operação transacional.
- Os dados permanecem disponíveis após atualização de página e nova autenticação.

### Transferências internas

- Transferência imediata entre contas Monavero, identificadas por agência e número.
- Validação de titularidade da origem, status de contas, saldo, limite por operação e formato dos dados no servidor.
- Registro atômico de débito, crédito e lançamento bancário no PostgreSQL.
- Chave de idempotência para proteger contra repetição da mesma transferência após falha de rede.
- A interface apresenta agência e conta da origem e permite selecionar outra conta do mesmo titular como destino.
- Mensagens de erro e confirmação são mostradas em linguagem de produto; diagnósticos detalhados ficam no console, não na interface.
- O acesso demonstrativo permite transferências somente entre contas da própria demonstração.

### Experiência e recursos auxiliares

- Layout responsivo, temas claro/escuro, formulários reativos e mensagens de validação acessíveis.
- Pagamentos, notificações e auditoria possuem funcionalidades de interface, mas a persistência dos fluxos ainda não está integralmente implementada no backend.
- Perfis visuais de gerente e administrador no modo demonstração **não** concedem permissões administrativas reais.

## Limites e funcionalidades futuras

Não há PIX/TED real, integração com instituições financeiras, liquidação de boletos, emissão real de cartões nem investimento financeiro real. Agendamento de transferências, processamento demonstrativo persistido de pagamentos, autorizações administrativas e evolução de auditoria/notificações permanecem no roadmap.

## Arquitetura e validação

- **Frontend:** Angular 19/TypeScript, publicado no Netlify como SPA estática.
- **Backend:** Java 25 e Spring Boot 4.1.1, publicado na Blitz.
- **Persistência:** PostgreSQL 18 (Neon), migrações Flyway até V5.
- **Validação:** CI independente para frontend e backend; a implementação de cada funcionalidade não substitui a aprovação de seus testes e verificações em ambiente publicado.

Consulte [a arquitetura](ARQUITETURA.md), [o roteiro de testes](TESTES.md) e [o roadmap](ROADMAP.md) para o estado detalhado de cada etapa.

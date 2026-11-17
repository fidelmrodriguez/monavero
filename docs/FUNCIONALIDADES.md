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
- Crédito fictício de abertura de R$ 1.000,00, uma única vez por conta pessoal, para viabilizar operações entre usuários cadastrados; não é dinheiro real nem recarregável pela API.
- Contas antigas vazias e sem movimentações também podem receber o crédito uma única vez; contas com histórico permanecem inalteradas.
- Painel com saldo consolidado, contas e movimentações recentes.
- Investimentos não implementados não são apresentados como produtos contratados. Os cartões virtuais são somente simulação, sem emissão nem pagamento real.

### Extrato

- Lançamentos bancários registrados e consultados pela API Java, com filtros e pesquisa no Angular.
- As transferências internas geram lançamentos de débito e crédito na mesma operação transacional.
- Os dados permanecem disponíveis após atualização de página e nova autenticação.

### Transferências internas

- Transferência imediata entre contas Monavero, identificadas por agência e número, inclusive entre contas pessoais de usuários distintos.
- Validação de titularidade da origem, status de contas, saldo, limite por operação e formato dos dados no servidor.
- Registro atômico de débito, crédito e lançamento bancário no PostgreSQL.
- Chave de idempotência para proteger contra repetição da mesma transferência após falha de rede.
- A interface apresenta agência e conta da origem e permite selecionar outra conta do mesmo titular como destino.
- Mensagens de erro e confirmação são mostradas em linguagem de produto; diagnósticos detalhados ficam no console, não na interface.
- A identidade demonstrativa pública só transfere entre suas próprias contas; contas pessoais não podem transferir para essa identidade pública.

### Transferências agendadas

- Agendamento de transferências para data/hora futura (entre um minuto e 90 dias), persistido via Flyway V7.
- Consulta e cancelamento exclusivos do usuário que criou o agendamento, antes da execução.
- Execução pelo servidor com bloqueio da linha e chave de idempotência ligada ao UUID do agendamento; débito/crédito somente no vencimento.
- Sem reserva antecipada de saldo: saldo insuficiente no processamento faz a transferência ser recusada, sem débito parcial.
- Se o servidor dormir, os agendamentos vencidos são processados quando voltar a ficar online; não há garantia de pontualidade na hospedagem gratuita.

### Pagamentos demonstrativos

- Pagamento imediato por conta pessoal ou demonstrativa com autorização da API, valor em BRL e beneficiário de referência; gera um único lançamento de débito no extrato.
- Agendamento para data futura, cancelamento enquanto pendente e execução pelo servidor. Não reserva saldo; falta de saldo no vencimento marca o agendamento como recusado.
- Histórico por titular, confirmação somente após resposta da API, chave idempotente e bloqueio concorrente no PostgreSQL; migração Flyway V8.
- **Não há liquidação de boleto, convênio ou pagamento a terceiros:** os valores são exclusivamente simulados dentro do Monavero.

### Experiência e recursos auxiliares

- Layout responsivo, temas claro/escuro, formulários reativos e mensagens de validação acessíveis.
- Pagamentos e notificações usam persistência própria. Auditoria administrativa é mantida pela API.
- O papel escolhido em `User / 1234` é gravado na sessão do backend e confirmado pelo token: CLIENT usa painel financeiro; MANAGER consulta indicadores, usuários e contas; ADMIN também pode alterar status e consultar auditoria. Contas pessoais não recebem funções administrativas pelo seletor.

## Limites e funcionalidades futuras

Não há PIX/TED real, integração com instituições financeiras, liquidação de boletos, emissão real de cartões nem investimento financeiro real. Cartões virtuais são apenas ilustração. Pagamentos demonstrativos são persistidos, mas não liquidados externamente.

## Arquitetura e validação

- **Frontend:** Angular 19/TypeScript, publicado no Netlify como SPA estática.
- **Backend:** Java 25 e Spring Boot 4.1.1, publicado na Blitz.
- **Persistência:** PostgreSQL 18 (Neon), migrações Flyway até V11.
- **Validação:** CI independente para frontend e backend; a implementação de cada funcionalidade não substitui a aprovação de seus testes e verificações em ambiente publicado.

Consulte [Arquitetura](ARQUITETURA.md) e [Testes](TESTES.md) para os fluxos, os controles e a validação do produto.

### Identificação de transferências entre titulares

- Extrato e movimentações recentes identificam o **remetente** nos créditos e o **destinatário** nos débitos, com nome cadastrado, agência e número de conta mascarado.
- A identificação é consultada a partir dos registros transacionais existentes; a descrição escrita pelo usuário não é usada como prova de titularidade. Transferências já realizadas também exibem a contraparte após a atualização.
- Uma transferência concluída limpa a validação do campo de valor, evitando alertas de formulário inválido junto à confirmação de sucesso.
- A API expõe os dados de contraparte apenas na consulta autenticada de lançamentos pertencentes ao usuário; os nomes não são registrados nos logs de diagnóstico do navegador.


### Consistência visual e auditoria

- Notificações e agendamentos são integrados à API e persistidos; não dependem de dados aleatórios no navegador.
- Agendamentos de transferências e pagamentos são persistidos e sujeitos ao despertar do servidor gratuito para execução.
- Investimentos não implementados não aparecem como produtos contratados; os cartões virtuais são explicitamente fictícios.
- A área administrativa e a trilha de auditoria persistente são implementadas no backend, com autorização verificada pelo servidor.


### Notificações, cartões fictícios e perfil

- Notificações geradas pela API nas operações confirmadas, persistidas por usuário com leitura individual; o sino e a central são sincronizados com o servidor ao acessar.
- Cartões virtuais demonstrativos com apelido, quatro dígitos inventados e estados ativo, bloqueado e cancelado. Não há número bancário real, CVV, compra ou limite de crédito.
- Perfil pessoal permite mudar nome de exibição, senha (com revogação de sessões) e encerrar outras sessões. O guest compartilhado não pode alterar dados pessoais nem controlar as sessões de outros visitantes.
- Persistência via Flyway V10, controles de acesso e testes de integração.

### Segurança e operação

- A API atribui um `X-Request-Id` novo a cada requisição, útil para correlacionar erros nos logs do backend; o ID fornecido pelo cliente não é reutilizado.
- Endpoints `/api/**` usam `Cache-Control: no-store`, incluindo respostas de autenticação e informações bancárias.
- Logs de requisições lentas ou com erro 5xx incluem método, status e duração, mas **não** registram tokens, payloads ou parâmetros de consulta.
- O Netlify aplica headers de proteção contra framing, MIME sniffing e uso não necessário de recursos do navegador.
- A versão 1.0.0 é de demonstração; os riscos e limitações permanecem descritos em [Segurança e autenticação](SEGURANCA_AUTENTICACAO.md).

### Perfis e painéis

- Cliente: dashboard financeiro com indicadores calculados do extrato disponível, contas, atalhos e transações.
- Gerente: dashboard de relacionamento com métricas agregadas reais e consulta de usuários/contas; sem alteração de status e sem auditoria.
- Administrador: dashboard administrativo, gestão de acessos e acesso ao histórico de auditoria.
- Os perfis demonstrativos compartilham a identidade bancária fictícia; os privilégios por sessão são validados pela API. A migração Flyway V11 mantém as sessões existentes sem `demo_role` com o perfil anterior até expirar.

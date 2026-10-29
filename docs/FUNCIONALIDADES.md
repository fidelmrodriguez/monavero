# Funcionalidades do Monavero

Este documento descreve a aplicação tal como implementada no frontend. Todos os valores financeiros, transações e perfis são utilizados apenas para demonstração.

## Login e sessão

- Formulário reativo com usuário e senha editáveis, além de cadastro de conta pessoal.
- Credenciais iniciais de teste: `User` e `1234`.
- Autenticação própria pelo Spring Security, token opaco e validação da sessão no PostgreSQL.
- Redirecionamento após login, proteção de rotas e opção de logout.
- Papéis definidos pelo backend; contas novas e demo recebem `CLIENT`. Áreas de gerente e administrador não são liberadas pelo formulário.

## Painel financeiro

- Resumo de contas corrente e salário com saldos ilustrativos.
- Carteira de investimentos, limite/uso de cartões e gráficos próprios em SVG.
- Relação de transações recentes e acesso ao extrato completo.
- Recurso de fallback para manter o painel com dados demonstrativos se a DummyJSON não responder.

## Extrato

- Listagem com data, descrição, categoria, tipo, canal, status e valor.
- Busca textual e filtros por período, tipo, status e valores mínimo/máximo.
- Somatórios de entradas, saídas e resultado para a seleção atual.
- Mensagem de estado vazio quando não houver movimentações correspondentes.

## Transferências

- Formulário com conta de origem, favorecido, agência, conta de destino, valor, data e descrição.
- Verificação de preenchimento obrigatório, formato da agência, valor mínimo e teto demonstrativo de R$ 50 mil.
- Indicação de insuficiência de saldo baseada na conta selecionada e no valor digitado.
- Ao confirmar, o sistema cria feedback visual, notificação e registro local de auditoria; não há débito/crédito efetivo ou persistência.

## Pagamentos

- Formulário de código de barras, beneficiário, valor e data.
- Validação dos campos e inclusão de um item na lista de pagamentos programados.
- Agendamentos mantidos na memória do serviço, sem banco de dados ou processamento de boletos.

## Notificações e auditoria

- Notificações iniciais, eventos criados por ações e avisos simulados periodicamente.
- Indicação de mensagens não lidas, marcação individual e marcação de todas como lidas.
- Auditoria local de eventos da interface, com busca textual e registros fictícios predefinidos.
- Os dados não são logs de servidores bancários nem registros de operações financeiras reais.

## Administração e perfil

- Rotas reservadas para perfis `MANAGER` e `ADMIN` permanecem previstas na interface; perfis públicos são `CLIENT` e não podem elevar privilégios.
- A página administrativa exibe políticas e botões que simulam solicitações de revisão.
- A página de perfil exibe o usuário e permite alternar os temas claro e escuro.

## Experiência visual

- Navegação com sidebar em telas maiores e menu recolhível em telas pequenas.
- Topbar com notificações, menu do usuário, data localizada e alternância de tema.
- Feedback por componentes próprios, sem caixas nativas de confirmação.
- Componentes standalone, carregamento de páginas sob demanda e estilos SCSS.

## Fora do escopo desta versão

A versão do frontend não contém cadastro de contas bancárias, ledger, conciliação, histórico persistente, PIX real, processamento de boletos, regras de prevenção a fraude no servidor ou integração com instituições financeiras.


### Etapa 5 — persistência financeira

Dashboard e extrato passam a consumir contas e lançamentos reais no Neon, isolados por identidade autenticada. As movimentações fictícias da conta demo são persistidas; usuários pessoais têm contas independentes, iniciadas sem movimentações. Transferências, pagamentos e funcionalidades de cartões/investimentos continuam no roadmap.

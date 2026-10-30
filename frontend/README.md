# Frontend · Monavero

Interface de banco digital desenvolvida com **Angular 19**, TypeScript e SCSS, publicada no Netlify como **SPA estática**. Este repositório mantém uma apresentação voltada ao usuário final; textos de testes, etapas e infraestrutura são exclusivos da documentação e dos diagnósticos de desenvolvimento.

[Visão geral](../README.md) · [Backend](../backend/README.md) · [Funcionalidades](../docs/FUNCIONALIDADES.md) · [Deploy](../docs/DEPLOY_NETLIFY.md)

## Experiência do usuário

- **Acesso:** login demonstrativo, cadastro pessoal, sessão autenticada, logout e navegação protegida.
- **Painel:** saldos por conta, lançamentos recentes e indicadores financeiros. Cartões e investimentos ainda podem ser ilustrativos no acesso de demonstração.
- **Extrato:** movimentações persistidas com filtros e pesquisa.
- **Transferências:** formulário com origem, agência e número do destino, valor e descrição; confirmação apenas após resposta positiva da API, atualização de saldos e histórico.
- **Pagamentos:** interface de agendamento demonstrativo; ainda sem execução/persistência bancária no servidor.
- **Perfil e navegação:** temas claro/escuro, layout responsivo, notificações e áreas visuais de administração em evolução.

Os campos de transferência exibem os dados da conta de origem. Quando há outra conta do mesmo titular, o usuário pode selecioná-la como destino. A validação não desloca os campos horizontalmente e a interface não apresenta comandos ou instruções de QA.

## Tecnologias

| Componente | Utilização |
| --- | --- |
| Angular standalone + Router | Telas e navegação protegida sob demanda |
| Signals + RxJS | Estado reativo e integração HTTP |
| Reactive Forms | Validações de login, pagamentos e transferências |
| TypeScript + SCSS | Tipos, estilos e responsividade |
| API Java | Autenticação, contas, extrato e transferências |
| Jasmine + Karma | Testes unitários e de interface |

A API é publicada na Blitz; o frontend solicita `/api/monavero-readiness` pela própria origem Netlify, encaminhada ao health check da API. As rotas internas usam fallback SPA em `_redirects`. O carregamento inicial depende de a API estar disponível.

## Estrutura

```text
frontend/
├── public/                    # Recursos estáticos e redirecionamentos Netlify
├── src/app/
│   ├── core/                  # Modelos, autenticação, API, estado e utilitários
│   ├── features/              # Páginas e formulários de produto
│   ├── layout/                # Shell, sidebar e navegação
│   └── shared/                # Componentes compartilhados
├── angular.json               # Build estático Angular
├── proxy.conf.json            # Readiness na execução local
└── package.json
```

## Executar e validar

```bash
cd frontend
npm install
npm run dev
```

```bash
npm run typecheck
npm run build
npm test
```

Node.js 22 é a versão definida em `.nvmrc`. Os testes Karma requerem Chrome ou Chromium. O Netlify publica `frontend/dist/monavero/browser` e não deve usar o runtime SSR Angular nesse deploy.

### Acesso

A demonstração aceita `User / 1234`. Contas pessoais devem entrar com seu e-mail de cadastro e senha próprios. O seletor de perfil do modo demonstração controla apenas a visualização; permissões bancárias são sempre verificadas na API.

### Diagnóstico técnico

Logs estruturados dos fluxos de autenticação, contas, extrato e transferências são emitidos **somente no console do navegador**, sem senhas, e-mails, tokens ou identificadores completos de conta. As mensagens visíveis ao usuário apresentam apenas estados do produto, sem identificadores de etapas ou dependências internas.

O roteiro de validação está em [docs/TESTE_ETAPAS_5_6_CONSOLE.md](../docs/TESTE_ETAPAS_5_6_CONSOLE.md). Informações sobre acesso à API, cold start e proxy estão em [deploy Netlify](../docs/DEPLOY_NETLIFY.md).

## Limites

O Monavero é um ambiente demonstrativo: não realiza PIX, TED, pagamento real ou investimento. Algumas experiências da interface ainda usam dados locais enquanto a persistência é ampliada nas próximas entregas. O roadmap registra o estado real de cada implementação.


### Estados de carregamento e layout

- As mudanças de rota têm indicação visual durante carregamento de módulos, guards e resolvers.
- Extrato: spinner apenas durante a consulta, mensagem de falha com **Tentar novamente** e tabela após resposta válida; filtros aplicados localmente sem espera simulada.
- Transferências: indicação ao carregar contas, processar operação e atualizar saldos; formulário permanece protegido contra reenvios durante a operação.
- Tabelas de extrato e dashboard não devem expandir a página: os textos longos quebram linha, o contêiner limita a largura e o layout móvel usa cartões.
- Os estados de carregamento são textos normais para o cliente, enquanto diagnósticos das etapas permanecem exclusivamente no console.

### Transferências agendadas

A rota `/app/agendamentos` permite criar, listar e cancelar agendamentos internos. As datas são informadas em horário local e enviadas à API em UTC. O processamento ocorre no backend e não depende de uma aba aberta. O saldo é debitado apenas no vencimento; em hospedagem sob demanda a execução pode ocorrer na próxima ativação do servidor. Não há componentes de QA nas telas.

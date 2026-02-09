# Documentação - ROI Analytics Pro

Bem-vindo à documentação completa do projeto **ROI Analytics Pro**, uma plataforma web para mensuração e análise de ROI (Retorno sobre Investimento) de projetos de Inteligência Artificial.

## 📚 Índice da Documentação

### Documentos Principais

#### [ARCHITECTURE.md](./ARCHITECTURE.md)
**Design Document Técnico Completo**

- Arquitetura do sistema e stack tecnológico
- Estrutura de camadas (Presentation, Service, Data)
- Fluxos de dados principais
- Modelo de dados e relacionamentos
- Padrões de código e decisões arquiteturais
- Diagramas de arquitetura

**Ideal para**: Desenvolvedores que precisam entender a estrutura geral do sistema.

#### [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md)
**Lógica de Negócio e Cálculos de ROI**

- Modelo de dados (types.ts como fonte de verdade)
- Tipos de melhoria e suas fórmulas
- Cálculos detalhados por tipo (PRODUCTIVITY, REVENUE_INCREASE, etc.)
- Fórmulas agregadas (ROI Total, Payback, Economia Líquida)
- Exemplos práticos de cálculos
- Validações e regras de negócio

**Ideal para**: Desenvolvedores que precisam entender ou modificar cálculos de ROI.

#### [API_SERVICES.md](./API_SERVICES.md)
**Documentação de Serviços e Integrações**

- Todos os serviços e seus métodos
- Integrações externas (Supabase, Google Gemini, Resend)
- Tratamento de erros
- Edge Functions
- Exemplos de uso

**Ideal para**: Desenvolvedores que precisam usar ou modificar serviços.

#### [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md)
**Guia Frontend e Padrões UI/UX**

- Estrutura de componentes e páginas
- Componentes reutilizáveis (KPICard, Sidebar, Toast, etc.)
- Sistema de temas (Dark Mode)
- Roteamento e navegação
- Hooks customizados
- Gráficos (Recharts)
- Estilos de impressão (PDF)

**Ideal para**: Desenvolvedores frontend trabalhando na interface.

#### [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
**Esquema de Banco de Dados**

- Estrutura de todas as tabelas
- Relacionamentos entre entidades
- Políticas RLS (Row Level Security)
- Triggers e Functions
- Migrations
- Índices e performance

**Ideal para**: Desenvolvedores que precisam entender ou modificar o banco de dados.

#### [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
**Guia de Desenvolvimento**

- Setup do ambiente
- Scripts disponíveis
- Convenções de código
- Processo de desenvolvimento
- Debugging
- Testes (futuro)
- Troubleshooting

**Ideal para**: Novos desenvolvedores entrando no projeto.

#### [DEPLOYMENT.md](./DEPLOYMENT.md)
**Guia de Deploy**

- Configuração do Supabase
- Build de produção
- Deploy no Vercel
- Deploy no Netlify
- Deploy manual (servidor próprio)
- Configuração de Edge Functions
- Verificações pós-deploy
- Troubleshooting

**Ideal para**: DevOps e desenvolvedores responsáveis pelo deploy.

#### [SKILLS_MATRIX.md](./SKILLS_MATRIX.md)
**Matriz de Skills Necessárias**

- Skills essenciais (Core)
- Skills importantes (Important)
- Skills complementares (Nice to Have)
- Skills de negócio
- Níveis de proficiência (Júnior, Pleno, Sênior)
- Roadmap de desenvolvimento
- Recursos de aprendizado

**Ideal para**: Gestores de equipe, recrutadores, e desenvolvedores que querem se desenvolver.

### Diagramas

Diagramas Mermaid estão disponíveis em `/docs/diagrams/`:

- **architecture.mmd**: Diagrama de arquitetura completa
- **data-flow.mmd**: Fluxo de dados detalhado
- **roi-calculation.mmd**: Fluxo de cálculo de ROI

## 🚀 Início Rápido

### Para Desenvolvedores Novos

1. Leia [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) para setup
2. Explore [ARCHITECTURE.md](./ARCHITECTURE.md) para entender a estrutura
3. Estude [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) para entender a lógica de negócio
4. Consulte [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md) para padrões de UI

### Para Desenvolvedores Frontend

1. [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md) - Padrões e componentes
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - Estrutura geral
3. [API_SERVICES.md](./API_SERVICES.md) - Como usar serviços

### Para Desenvolvedores Backend/Database

1. [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Estrutura do banco
2. [API_SERVICES.md](./API_SERVICES.md) - Serviços e integrações
3. [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) - Lógica de cálculos

### Para DevOps

1. [DEPLOYMENT.md](./DEPLOYMENT.md) - Guia completo de deploy
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - Stack e infraestrutura

### Para Gestores/Recrutadores

1. [SKILLS_MATRIX.md](./SKILLS_MATRIX.md) - Skills necessárias
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - Visão geral técnica

## 📖 Estrutura do Projeto

```
dashboard-roi-v4/
├── pages/              # Componentes de página (rotas)
├── components/        # Componentes reutilizáveis
├── services/          # Lógica de negócio e APIs
├── contexts/          # Context API (estado global)
├── hooks/             # Custom hooks
├── types.ts           # Definições TypeScript (fonte de verdade)
├── constants.tsx     # Constantes e labels
├── migrations/        # SQL migrations para Supabase
└── docs/              # Esta documentação
```

## 🔑 Conceitos Principais

### Multi-tenancy

A aplicação suporta múltiplas organizações através de:
- Isolamento por `organization_id` em todas as tabelas
- Row Level Security (RLS) no Supabase
- Context de autenticação que gerencia organização do usuário

### Cálculo de ROI

O ROI é calculado através de:
- **Indicadores**: Comparam baseline vs pós-IA
- **Tipos de Melhoria**: PRODUCTIVITY, REVENUE_INCREASE, RISK_REDUCTION, etc.
- **Agregação**: Soma de todos os indicadores ativos
- **Fórmulas**: Específicas por tipo de melhoria

Ver [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) para detalhes completos.

### Integração com IA

A aplicação gera insights executivos via Google Gemini API:
- Prompts customizáveis por organização
- Análise de métricas agregadas
- Insights específicos por projeto

## 🛠️ Stack Tecnológico

- **Frontend**: React 19 + TypeScript 5.8 + Vite 6
- **Styling**: Tailwind CSS
- **Roteamento**: React Router DOM 7
- **Gráficos**: Recharts 3.7
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **IA**: Google Gemini API
- **Email**: Resend

## 📝 Convenções

- **Arquivos**: PascalCase para componentes, camelCase para serviços
- **Código**: TypeScript estrito, interfaces explícitas
- **Commits**: Conventional Commits
- **Documentação**: Markdown com diagramas Mermaid

## 🔍 Busca Rápida

**Precisa entender...**

- **Como funciona o cálculo de ROI?** → [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md)
- **Como adicionar novo tipo de melhoria?** → [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md#adicionar-novo-tipo-de-melhoria)
- **Como criar novo componente?** → [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md)
- **Como fazer deploy?** → [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Quais skills são necessárias?** → [SKILLS_MATRIX.md](./SKILLS_MATRIX.md)
- **Como funciona a autenticação?** → [ARCHITECTURE.md](./ARCHITECTURE.md#fluxo-de-autenticação)
- **Como adicionar nova página?** → [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#adicionar-nova-página)

## 🤝 Contribuindo

Ao contribuir com o projeto:

1. Leia [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) para convenções
2. Siga os padrões de código documentados
3. Atualize a documentação se necessário
4. Use Conventional Commits para mensagens

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte a documentação relevante
2. Verifique [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#troubleshooting)
3. Consulte issues do projeto (se aplicável)

## 📅 Atualizações

Esta documentação é mantida junto com o código. Última atualização: 2024.

---

**Nota**: Esta documentação é um trabalho em progresso. Se encontrar informações desatualizadas ou faltando, por favor abra uma issue ou contribua com melhorias.

# API Services Documentation - ROI Analytics Pro


alwaysApply:true


## Visão Geral

Este documento descreve todos os serviços da aplicação, suas responsabilidades, métodos disponíveis, e como interagem com as APIs externas (Supabase, Google Gemini, Resend).

## Estrutura de Serviços

A aplicação utiliza uma camada de serviços que encapsula toda a lógica de negócio e comunicação com APIs externas. Todos os serviços estão localizados em `/services`.

## projectService

**Arquivo**: `services/projectService.ts`

**Responsabilidade**: Gerenciar operações CRUD de projetos e indicadores.

### Métodos de Projeto

#### `getAll(organizationId?: string): Promise<Project[]>`

Busca todos os projetos de uma organização.

**Parâmetros**:
- `organizationId` (opcional): UUID da organização. Se não fornecido, busca organização padrão.

**Retorno**: Array de projetos ordenados por `created_at` (mais recentes primeiro).

**Comportamento**:
- Se `organizationId` não for fornecido ou não for um UUID válido, busca ou cria organização padrão
- Filtra projetos por `organization_id`
- Ordena por `created_at` descendente

**Exemplo**:
```typescript
const projects = await projectService.getAll();
// ou
const projects = await projectService.getAll('org-uuid-here');
```

#### `getById(id: string): Promise<Project | null>`

Busca um projeto específico por ID.

**Parâmetros**:
- `id`: UUID do projeto

**Retorno**: Projeto ou `null` se não encontrado

**Exemplo**:
```typescript
const project = await projectService.getById('project-uuid');
if (project) {
  console.log(project.name);
}
```

#### `create(project: Omit<Project, 'id'>): Promise<Project>`

Cria um novo projeto.

**Parâmetros**:
- `project`: Objeto projeto sem o campo `id` (gerado automaticamente)

**Retorno**: Projeto criado com `id` gerado

**Validação**:
- Se `organization_id` não for UUID válido, usa organização padrão

**Exemplo**:
```typescript
const newProject = await projectService.create({
  organization_id: 'org-uuid',
  name: 'Novo Projeto',
  description: 'Descrição do projeto',
  status: ProjectStatus.PLANNING,
  development_type: DevelopmentType.CHATBOT,
  start_date: '2024-01-01',
  implementation_cost: 50000,
  monthly_maintenance_cost: 1000,
});
```

#### `update(id: string, updates: Partial<Project>): Promise<Project>`

Atualiza um projeto existente.

**Parâmetros**:
- `id`: UUID do projeto
- `updates`: Objeto parcial com campos a atualizar

**Retorno**: Projeto atualizado

**Comportamento**:
- Apenas campos fornecidos são atualizados
- Campos `null` ou strings vazias são tratados apropriadamente

**Exemplo**:
```typescript
const updated = await projectService.update('project-uuid', {
  status: ProjectStatus.PRODUCTION,
  go_live_date: '2024-02-01',
});
```

#### `delete(id: string): Promise<void>`

Deleta um projeto (hard delete).

**Parâmetros**:
- `id`: UUID do projeto

**Atenção**: Esta operação é permanente. Indicadores relacionados não são deletados automaticamente.

**Exemplo**:
```typescript
await projectService.delete('project-uuid');
```

### Métodos de Indicador

#### `indicatorService.getByProjectId(projectId: string): Promise<Indicator[]>`

Busca todos os indicadores ativos de um projeto.

**Parâmetros**:
- `projectId`: UUID do projeto

**Retorno**: Array de indicadores ativos ordenados por `created_at`

**Exemplo**:
```typescript
const indicators = await indicatorService.getByProjectId('project-uuid');
```

#### `indicatorService.getById(id: string): Promise<Indicator | null>`

Busca um indicador específico por ID.

**Parâmetros**:
- `id`: UUID do indicador

**Retorno**: Indicador ou `null` se não encontrado

#### `indicatorService.create(indicator: Omit<Indicator, 'id'>): Promise<Indicator>`

Cria um novo indicador.

**Parâmetros**:
- `indicator`: Objeto indicador sem o campo `id`

**Retorno**: Indicador criado

**Exemplo**:
```typescript
const newIndicator = await indicatorService.create({
  project_id: 'project-uuid',
  name: 'Tempo de Análise',
  description: 'Tempo gasto analisando feedbacks',
  improvement_type: ImprovementType.PRODUCTIVITY,
  baseline: {
    people: [{
      id: 'p1',
      name: 'Analista',
      role: 'Análise',
      hourlyRate: 40,
      minutesSpent: 15,
      frequencyQuantity: 100,
      frequencyUnit: FrequencyUnit.MONTH,
    }],
  },
  postIA: {
    people: [{
      id: 'p1',
      name: 'Analista',
      role: 'Análise',
      hourlyRate: 40,
      minutesSpent: 2,
      frequencyQuantity: 100,
      frequencyUnit: FrequencyUnit.MONTH,
    }],
  },
  is_active: true,
});
```

#### `indicatorService.update(id: string, updates: Partial<Indicator>): Promise<Indicator>`

Atualiza um indicador existente.

**Parâmetros**:
- `id`: UUID do indicador
- `updates`: Objeto parcial com campos a atualizar

**Retorno**: Indicador atualizado

#### `indicatorService.delete(id: string): Promise<void>`

Soft delete de um indicador (marca como `is_active = false`).

**Parâmetros**:
- `id`: UUID do indicador

**Comportamento**: Não remove o registro, apenas marca como inativo.

## dashboardService

**Arquivo**: `services/dashboardService.ts`

**Responsabilidade**: Calcular métricas agregadas e estatísticas de ROI.

### Funções Principais

#### `calculateIndicatorStats(ind: Indicator)`

Calcula estatísticas de um indicador individual.

**Parâmetros**:
- `ind`: Indicador a ser calculado

**Retorno**:
```typescript
{
  monthlyEconomy: number;
  annualEconomy: number;
  improvementPct: string;
}
```

**Comportamento**:
- Calcula economia baseada no `improvement_type`
- Converte frequências para mensal
- Calcula percentual de melhoria

**Ver**: `BUSINESS_LOGIC.md` para fórmulas detalhadas.

#### `calculateKPIStats(projects: Project[], indicators: Indicator[]): KPIStats`

Calcula todas as métricas agregadas do dashboard.

**Parâmetros**:
- `projects`: Array de projetos
- `indicators`: Array de indicadores

**Retorno**: Objeto `KPIStats` com todas as métricas:
```typescript
{
  roi_total: number;
  economia_anual: number;
  horas_economizadas_ano: number;
  projetos_producao: number;
  projetos_concluidos: number;
  payback_medio: number;
  horas_baseline_ano: number;
  horas_posia_ano: number;
  custo_mo_baseline: number;
  custo_mo_posia: number;
  economia_mo: number;
  custo_ia_anual: number;
  economia_liquida: number;
  roi_calculado: number;
  payback_calculado: number;
}
```

#### `calculateHoursSaved(indicators: Indicator[]): number`

Calcula total de horas economizadas anualmente.

**Parâmetros**:
- `indicators`: Array de indicadores ativos

**Retorno**: Número de horas economizadas (arredondado)

#### `calculateEconomyHistory(projects: Project[], indicators: Indicator[]): EconomyHistoryItem[]`

Calcula histórico mensal de economia.

**Parâmetros**:
- `projects`: Array de projetos
- `indicators`: Array de indicadores

**Retorno**: Array de itens de histórico:
```typescript
{
  month: string;      // "Jan", "Fev", etc.
  bruta: number;      // Economia bruta
  investimento: number; // Custo de manutenção
  liquida: number;    // Economia líquida
}
```

#### `calculateDistributionByType(indicators: Indicator[]): DistributionItem[]`

Calcula distribuição de economia por tipo de melhoria.

**Parâmetros**:
- `indicators`: Array de indicadores ativos

**Retorno**: Array de distribuição:
```typescript
{
  type: string;    // Label do tipo
  value: number;   // Valor em R$
  color: string;   // Cor para gráfico
}
```

#### `dashboardService.getDashboardData(organizationId?: string)`

Busca todos os dados necessários para o dashboard.

**Parâmetros**:
- `organizationId` (opcional): UUID da organização

**Retorno**:
```typescript
{
  stats: KPIStats;
  economyHistory: EconomyHistoryItem[];
  distributionByType: DistributionItem[];
  projects: Project[];
  indicators: Indicator[];
}
```

**Comportamento**:
- Busca todos os projetos da organização
- Busca todos os indicadores de todos os projetos
- Calcula todas as métricas
- Retorna dados prontos para exibição

## authService

**Arquivo**: `services/authService.ts`

**Responsabilidade**: Gerenciar autenticação e perfis de usuário.

### Métodos de Autenticação

#### `signIn(email: string, password: string)`

Autentica um usuário.

**Parâmetros**:
- `email`: Email do usuário
- `password`: Senha do usuário

**Retorno**: Objeto com `user` e `session` do Supabase

**Erros**: Lança erro se credenciais inválidas

#### `signUp(email: string, password: string, fullName: string, organizationName: string)`

Cria novo usuário e organização.

**Parâmetros**:
- `email`: Email do usuário
- `password`: Senha do usuário
- `fullName`: Nome completo
- `organizationName`: Nome da organização

**Comportamento**:
1. Cria usuário no Supabase Auth
2. Cria organização
3. Aguarda trigger criar perfil
4. Atualiza perfil com `organization_id` e role `admin`

**Retorno**: Objeto com `user` criado

#### `signOut()`

Desautentica o usuário atual.

**Retorno**: `Promise<void>`

#### `getCurrentUser()`

Obtém usuário autenticado atual.

**Retorno**: `User | null`

#### `getUserProfile(userId: string): Promise<UserProfile | null>`

Busca perfil do usuário.

**Parâmetros**:
- `userId`: UUID do usuário

**Retorno**: Perfil ou `null` se não encontrado

#### `updateUserProfile(userId: string, updates: Partial<UserProfile>)`

Atualiza perfil do usuário.

**Parâmetros**:
- `userId`: UUID do usuário
- `updates`: Campos a atualizar

**Retorno**: Perfil atualizado

#### `updatePassword(newPassword: string)`

Atualiza senha do usuário.

**Parâmetros**:
- `newPassword`: Nova senha

#### `resetPassword(email: string)`

Envia email de reset de senha.

**Parâmetros**:
- `email`: Email do usuário

**Comportamento**: Envia email com link de reset via Supabase Auth

### Métodos de Gestão de Equipe (Admin)

#### `createUser(email, password, fullName, role, organizationId)`

Cria novo usuário na organização (apenas admins).

**Parâmetros**:
- `email`: Email do usuário
- `password`: Senha temporária
- `fullName`: Nome completo
- `role`: Role do usuário (`UserRole`)
- `organizationId`: UUID da organização

**Comportamento**:
- Verifica se usuário já existe via RPC `create_team_user`
- Se não existe, cria via `signUp`
- Atualiza perfil com organização e role

**Retorno**: Objeto com `success` e `user`

#### `removeUser(userId: string, organizationId: string)`

Remove usuário da organização (apenas admins).

**Parâmetros**:
- `userId`: UUID do usuário
- `organizationId`: UUID da organização

**Validações**:
- Não permite remover último admin da organização
- Verifica se usuário pertence à organização

**Comportamento**: Usa RPC `remove_team_user` para remover

## aiPromptService

**Arquivo**: `services/aiPromptService.ts`

**Responsabilidade**: Gerenciar prompts de IA e gerar insights.

### Métodos de Prompt

#### `getPrompt(): Promise<string>`

Busca prompt configurado da organização.

**Retorno**: String do prompt (ou prompt padrão se não configurado)

**Comportamento**:
- Busca prompt do banco de dados
- Se não encontrado, retorna `DEFAULT_PROMPT`
- Trata erros graciosamente

#### `savePrompt(promptText: string): Promise<void>`

Salva ou atualiza prompt da organização (apenas admins).

**Parâmetros**:
- `promptText`: Texto do prompt

**Validações**:
- Verifica se usuário é admin
- Verifica se tabela `ai_prompts` existe

**Comportamento**:
- Se já existe prompt, atualiza
- Se não existe, cria novo
- Um prompt por organização (UNIQUE constraint)

#### `getPromptFull(): Promise<AIPrompt | null>`

Busca prompt completo com metadados.

**Retorno**: Objeto `AIPrompt` ou `null`

### Métodos de Geração de Insights

#### `generateInsight(): Promise<string>`

Gera insight executivo para o dashboard.

**Comportamento**:
1. Busca todos os projetos da organização
2. Busca todos os indicadores
3. Calcula estatísticas via `calculateKPIStats`
4. Busca prompt configurado
5. Substitui variáveis no prompt:
   - `{roi_total}`
   - `{economia_anual}`
   - `{horas_economizadas_ano}`
   - `{projetos_producao}`
   - `{payback_medio}`
   - E outras variáveis disponíveis
6. Chama Google Gemini API
7. Retorna insight gerado

**Variáveis de Ambiente**:
- `API_KEY` ou `GEMINI_API_KEY`: Chave da API do Gemini

**Modelo**: `gemini-3-flash-preview`

**Retorno**: String com insight em markdown

#### `generateProjectInsight(projectId: string): Promise<string>`

Gera insight para um projeto específico.

**Parâmetros**:
- `projectId`: UUID do projeto

**Comportamento**:
- Similar a `generateInsight()`, mas apenas para um projeto
- Usa variáveis específicas do projeto:
  - `{nome_projeto}`
  - `{tipo_projeto}`
  - `{status_projeto}`
  - `{economia_anual_projeto}`
  - `{roi_projeto}`
  - `{sponsor_projeto}`
  - `{indicadores_ativos}`
  - `{horas_economizadas_projeto}`

**Retorno**: String com insight em markdown

## Integrações Externas

### Supabase

**Cliente**: `services/supabase.ts`

**Configuração**:
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

**Uso**:
```typescript
import { supabase } from './services/supabase';

const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('organization_id', orgId);
```

**Features Utilizadas**:
- **Auth**: Autenticação de usuários
- **Database**: Queries e mutations
- **RLS**: Row Level Security (filtragem automática)
- **Edge Functions**: Funções serverless

### Google Gemini API

**SDK**: `@google/genai`

**Configuração**:
```typescript
const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey });
```

**Uso**:
```typescript
const response = await ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: prompt,
});

const insight = response.text;
```

**Modelo**: `gemini-3-flash-preview`

**Variáveis de Ambiente**:
- `API_KEY` ou `GEMINI_API_KEY` (definido em `vite.config.ts`)

### Resend (Email)

**Uso**: Via Edge Function `send-welcome-email`

**Endpoint**: `supabase/functions/send-welcome-email`

**Tipos de Email**:
- `welcome`: Email de boas-vindas com credenciais
- `role_change`: Notificação de mudança de função

**Configuração**:
- `RESEND_API_KEY`: Chave da API Resend
- `SUPABASE_URL`: URL do Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key

**Chamada**:
```typescript
const response = await fetch(
  `${supabaseUrl}/functions/v1/send-welcome-email`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: 'user@example.com',
      type: 'welcome',
      organizationName: 'Org Name',
      fullName: 'User Name',
      password: 'temp-password',
    }),
  }
);
```

## Tratamento de Erros

### Padrão de Erro

Todos os serviços seguem o padrão:
- Lançam erros nativos do Supabase/API
- Erros são capturados nos componentes
- Mensagens de erro são exibidas via Toast

### Códigos de Erro Comuns

**Supabase**:
- `PGRST116`: Registro não encontrado
- `42501`: Permissão negada (RLS)
- `42P01`: Tabela não existe

**Tratamento**:
```typescript
try {
  const data = await projectService.getById(id);
  if (!data) {
    // Tratar não encontrado
  }
} catch (error) {
  if (error.code === 'PGRST116') {
    // Registro não encontrado
  } else {
    // Outro erro
    console.error(error);
  }
}
```

## Edge Functions

### cleanup-indicators

**Localização**: `supabase/functions/cleanup-indicators/index.ts`

**Propósito**: Limpeza automática de indicadores inativos há mais de 90 dias.

**Agendamento**: Deve ser configurado como cron job no Supabase.

**Variáveis de Ambiente**:
- `DATABASE_URL`: URL do banco
- `SERVICE_ROLE_KEY`: Service role key

**Retorno**:
```json
{
  "success": true,
  "deleted_count": 10,
  "deleted_ids": ["uuid1", "uuid2", ...],
  "retention_days": 90
}
```

### send-welcome-email

**Localização**: `supabase/functions/send-welcome-email/index.ts`

**Propósito**: Envio de emails transacionais via Resend.

**Método**: POST

**Body**:
```json
{
  "to": "user@example.com",
  "type": "welcome" | "role_change",
  "organizationName": "Org Name",
  "fullName": "User Name",
  "password": "temp-password",
  "oldRole": "analyst",
  "newRole": "manager"
}
```

## Referências

- Código fonte: `/services/*.ts`
- Tipos: `types.ts`
- Configuração: `vite.config.ts`
- Migrations: `/migrations/*.sql`

# Database Schema - ROI Analytics Pro

## Visão Geral

Este documento descreve a estrutura do banco de dados PostgreSQL no Supabase, incluindo tabelas, relacionamentos, índices, triggers e políticas de Row Level Security (RLS).

## Estrutura de Tabelas

### organizations

Tabela principal para multi-tenancy. Cada organização é isolada dos dados de outras.

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Campos**:
- `id`: UUID único da organização
- `name`: Nome da organização
- `created_at`: Data de criação
- `updated_at`: Data de última atualização

**Índices**:
- Primary key em `id`

**RLS**: Habilitado (políticas definidas)

### user_profiles

Perfis de usuários vinculados a organizações.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  phone TEXT,
  position TEXT,
  department TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Campos**:
- `id`: UUID do usuário (referência a `auth.users`)
- `email`: Email do usuário
- `full_name`: Nome completo
- `role`: Role do usuário (`admin`, `manager`, `analyst`, `viewer`)
- `organization_id`: UUID da organização
- `phone`: Telefone (opcional)
- `position`: Cargo (opcional)
- `department`: Departamento (opcional)
- `avatar_url`: URL do avatar (opcional)
- `created_at`: Data de criação
- `updated_at`: Data de última atualização

**Relacionamentos**:
- `id` → `auth.users(id)` (CASCADE DELETE)
- `organization_id` → `organizations(id)` (SET NULL)

**Índices**:
- Primary key em `id`
- Index em `organization_id` (para queries RLS)

**RLS**: Habilitado com políticas:
- Usuários veem seu próprio perfil
- Admins/Managers veem membros da mesma organização

**Triggers**:
- Criação automática via trigger quando usuário é criado em `auth.users`

### projects

Projetos de IA vinculados a organizações.

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  development_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  go_live_date DATE,
  end_date DATE,
  implementation_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  monthly_maintenance_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  business_area TEXT,
  sponsor TEXT,
  roi_percentage NUMERIC(5, 2),
  total_economy_annual NUMERIC(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Campos**:
- `id`: UUID único do projeto
- `organization_id`: UUID da organização (NOT NULL)
- `name`: Nome do projeto
- `description`: Descrição do projeto
- `status`: Status (`planning`, `development`, `testing`, `production`, `on_hold`, `completed`, `cancelled`)
- `development_type`: Tipo de desenvolvimento (`chatbot`, `copilot`, `automation_n8n`, etc.)
- `start_date`: Data de início
- `go_live_date`: Data de go-live (opcional)
- `end_date`: Data de término (opcional)
- `implementation_cost`: Custo de implementação
- `monthly_maintenance_cost`: Custo mensal de manutenção
- `business_area`: Área de negócio (opcional)
- `sponsor`: Patrocinador do projeto (opcional)
- `roi_percentage`: ROI calculado (opcional, cache)
- `total_economy_annual`: Economia anual total (opcional, cache)
- `created_at`: Data de criação
- `updated_at`: Data de última atualização

**Relacionamentos**:
- `organization_id` → `organizations(id)` (CASCADE DELETE)

**Índices**:
- Primary key em `id`
- Index em `organization_id` (para queries RLS e performance)
- Index em `status` (para filtros)

**RLS**: Habilitado com políticas:
- Usuários veem projetos da sua organização

**Constraints**:
- `implementation_cost >= 0`
- `monthly_maintenance_cost >= 0`

### indicators

Indicadores de melhoria vinculados a projetos.

```sql
CREATE TABLE indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  improvement_type TEXT NOT NULL,
  baseline JSONB NOT NULL DEFAULT '{}',
  post_ia JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Campos**:
- `id`: UUID único do indicador
- `project_id`: UUID do projeto (NOT NULL)
- `name`: Nome do indicador
- `description`: Descrição do indicador
- `improvement_type`: Tipo de melhoria (`productivity`, `revenue_increase`, etc.)
- `baseline`: Dados baseline (JSONB)
- `post_ia`: Dados pós-IA (JSONB)
- `is_active`: Se o indicador está ativo (soft delete)
- `created_at`: Data de criação
- `updated_at`: Data de última atualização

**Relacionamentos**:
- `project_id` → `projects(id)` (CASCADE DELETE)

**Índices**:
- Primary key em `id`
- Index em `project_id` (para queries)
- Index em `is_active` (para filtros)
- Index GIN em `baseline` e `post_ia` (para queries JSONB, se necessário)

**RLS**: Habilitado com políticas:
- Usuários veem indicadores de projetos da sua organização (herda de projects)

**Estrutura JSONB**:

`baseline` e `post_ia` seguem a estrutura `IndicatorData`:

```json
{
  "people": [
    {
      "id": "string",
      "name": "string",
      "role": "string",
      "hourlyRate": number,
      "minutesSpent": number,
      "frequencyQuantity": number,
      "frequencyUnit": "hour" | "day" | "week" | "month" | "quarter" | "year"
    }
  ],
  "tools": [
    {
      "id": "string",
      "name": "string",
      "monthlyCost": number,
      "otherCosts": number,
      "isIACost": boolean,
      "frequencyQuantity": number,
      "frequencyUnit": "string"
    }
  ],
  "value": number,
  "revenue": number,
  "cost": number,
  "probability": number,
  "impact": number,
  // ... outros campos conforme ImprovementType
}
```

### ai_prompts

Prompts customizados de IA por organização.

```sql
CREATE TABLE ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id)
);
```

**Campos**:
- `id`: UUID único do prompt
- `organization_id`: UUID da organização (NOT NULL, UNIQUE)
- `prompt_text`: Texto do prompt
- `created_at`: Data de criação
- `updated_at`: Data de última atualização

**Relacionamentos**:
- `organization_id` → `organizations(id)` (CASCADE DELETE)

**Índices**:
- Primary key em `id`
- Unique constraint em `organization_id`
- Index em `organization_id` (para queries RLS)

**RLS**: Habilitado com políticas:
- Usuários veem prompts da sua organização
- Apenas admins/managers podem inserir/atualizar

## Relacionamentos

```
organizations (1) ──< (N) user_profiles
organizations (1) ──< (N) projects
organizations (1) ──< (1) ai_prompts
projects (1) ──< (N) indicators
auth.users (1) ──< (1) user_profiles
```

## Row Level Security (RLS)

### Políticas Gerais

**Habilitar RLS**:
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Políticas por Tabela

#### organizations

**SELECT**: Usuários veem organizações da qual fazem parte
```sql
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );
```

#### user_profiles

**SELECT**: Usuários veem seu próprio perfil + admins/managers veem membros da organização
```sql
CREATE POLICY "Admins and managers can view organization members" ON user_profiles
  FOR SELECT USING (
    auth.uid() = id
    OR
    (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.organization_id = user_profiles.organization_id
        AND up.role IN ('admin', 'manager')
      )
      AND user_profiles.organization_id IS NOT NULL
    )
  );
```

**UPDATE**: Similar ao SELECT

**INSERT**: Admins/managers podem inserir membros

#### projects

**SELECT**: Usuários veem projetos da sua organização
```sql
CREATE POLICY "Users can view projects from their organization" ON projects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );
```

**INSERT/UPDATE/DELETE**: Similar, com permissões por role

#### indicators

**SELECT**: Herda permissão de projects (através de project_id)
```sql
CREATE POLICY "Users can view indicators from their organization" ON indicators
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );
```

#### ai_prompts

**SELECT**: Usuários veem prompts da sua organização
**INSERT/UPDATE**: Apenas admins/managers

## Triggers

### update_updated_at_column()

Função genérica para atualizar `updated_at`:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Aplicação**:
```sql
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### create_user_profile()

Trigger que cria perfil automaticamente quando usuário é criado:

```sql
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();
```

## Functions (RPC)

### create_team_user

Cria usuário na equipe (verifica se já existe):

```sql
CREATE OR REPLACE FUNCTION create_team_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT,
  p_organization_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Verificar se usuário já existe
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;
  
  IF v_user_id IS NOT NULL THEN
    RETURN jsonb_build_object('requires_signup', false, 'user_id', v_user_id);
  END IF;
  
  RETURN jsonb_build_object('requires_signup', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### remove_team_user

Remove usuário da equipe:

```sql
CREATE OR REPLACE FUNCTION remove_team_user(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS JSONB AS $$
BEGIN
  -- Atualizar perfil para remover organização
  UPDATE user_profiles
  SET organization_id = NULL
  WHERE id = p_user_id
    AND organization_id = p_organization_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Migrations

As migrations estão localizadas em `/migrations/`:

1. **create_ai_prompts_table.sql**: Cria tabela `ai_prompts` com RLS
2. **add_team_management_rls.sql**: Adiciona políticas RLS para gestão de equipe
3. **add_indicators_cleanup.sql**: Cria tabela de log para limpeza de indicadores
4. **fix_ai_prompts_rls.sql**: Corrige políticas RLS de `ai_prompts`
5. **update_ai_prompts_admin_only.sql**: Restringe edição de prompts apenas para admins

**Ordem de execução**:
1. Criar tabelas base (organizations, user_profiles, projects, indicators)
2. Executar migrations na ordem numérica/alfabética

## Índices para Performance

### Recomendados

```sql
-- Projects
CREATE INDEX idx_projects_organization_status ON projects(organization_id, status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- Indicators
CREATE INDEX idx_indicators_project_active ON indicators(project_id, is_active);
CREATE INDEX idx_indicators_created_at ON indicators(created_at DESC);

-- User Profiles
CREATE INDEX idx_user_profiles_organization ON user_profiles(organization_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
```

## Limpeza Automática

### Tabela de Log

```sql
CREATE TABLE indicators_cleanup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_count INTEGER NOT NULL,
  deleted_ids UUID[] NOT NULL,
  retention_days INTEGER NOT NULL,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Edge Function**: `cleanup-indicators` executa limpeza de indicadores inativos há mais de 90 dias.

## Backup e Restore

### Backup

Supabase gerencia backups automaticamente. Backups diários são mantidos por 7 dias (plano Pro).

### Restore

Via Supabase Dashboard > Database > Backups.

## Referências

- Migrations: `/migrations/*.sql`
- Edge Functions: `/supabase/functions/*`
- Supabase Docs: https://supabase.com/docs

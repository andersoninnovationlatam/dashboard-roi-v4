# Limpeza Automática de Indicadores - Documentação

## Visão Geral

Este sistema implementa **hard delete** de indicadores inativos após um período de retenção de **90 dias**. Isso previne o crescimento excessivo do banco de dados mantendo um histórico adequado para auditoria.

## Arquitetura

### 1. Soft Delete (Atual)
- Quando um indicador é excluído, `is_active` é setado para `false`
- O indicador permanece no banco para possível recuperação
- Queries filtram por `is_active = true`

### 2. Hard Delete Automático
- Após 90 dias, indicadores inativos são permanentemente removidos
- Processo automatizado via Edge Function agendada
- Logs de auditoria são mantidos

## Componentes

### 1. Migration SQL (`add_indicators_cleanup.sql`)
- Cria índices para performance
- Cria funções SQL para limpeza
- Cria tabela de logs de auditoria

**Execute no SQL Editor do Supabase:**
```sql
-- Copie e cole o conteúdo de migrations/add_indicators_cleanup.sql
```

### 2. Edge Function (`supabase/functions/cleanup-indicators/`)
- Função serverless para executar limpeza
- Pode ser agendada via Cron Jobs do Supabase
- Registra logs de execução

**Deploy:**
```bash
supabase functions deploy cleanup-indicators
```

## Configuração Passo a Passo

### Passo 1: Executar Migration
1. Abra o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo de `migrations/add_indicators_cleanup.sql`
4. Execute o script

### Passo 2: Deploy da Edge Function
```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Login
supabase login

# Link do projeto
supabase link --project-ref [seu-project-ref]

# Deploy
supabase functions deploy cleanup-indicators
```

### Passo 3: Configurar Variáveis de Ambiente
1. Supabase Dashboard > **Edge Functions** > **cleanup-indicators** > **Settings**
2. Adicione:
   - `SUPABASE_URL`: https://[seu-projeto].supabase.co
   - `SUPABASE_SERVICE_ROLE_KEY`: (encontre em Settings > API)

### Passo 4: Configurar Agendamento
1. Supabase Dashboard > **Edge Functions** > **cleanup-indicators** > **Cron Jobs**
2. Clique em **Add Cron Job**
3. Configure:
   - **Schedule**: `0 2 * * *` (diariamente às 2h UTC)
   - **Function**: `cleanup-indicators`

## Execução Manual

### Via SQL
```sql
-- Executar limpeza manualmente
SELECT * FROM cleanup_inactive_indicators_with_log();
```

### Via Edge Function
```bash
curl -X POST https://[seu-projeto].supabase.co/functions/v1/cleanup-indicators \
  -H "Authorization: Bearer [service-role-key]"
```

## Monitoramento

### Verificar Logs de Limpeza
```sql
SELECT 
  cleanup_date,
  deleted_count,
  retention_days,
  execution_time_ms
FROM indicators_cleanup_log
ORDER BY cleanup_date DESC
LIMIT 10;
```

### Verificar Indicadores Pendentes
```sql
SELECT 
  COUNT(*) as total_inativos,
  COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '90 days') as aguardando_limpeza
FROM indicators
WHERE is_active = false;
```

### Verificar Performance dos Índices
```sql
EXPLAIN ANALYZE
SELECT * FROM indicators
WHERE is_active = false
  AND updated_at < NOW() - INTERVAL '90 days';
```

## Personalização

### Alterar Período de Retenção

**Na Edge Function:**
Edite `supabase/functions/cleanup-indicators/index.ts`:
```typescript
const RETENTION_DAYS = 90; // Altere para o valor desejado
```

**Na Função SQL:**
Edite `migrations/add_indicators_cleanup.sql`:
```sql
DECLARE
  retention_days INTEGER := 90; -- Altere aqui
```

### Alterar Frequência de Execução

No Cron Job do Supabase, altere a expressão cron:
- Diário às 2h: `0 2 * * *`
- Semanal (domingo às 2h): `0 2 * * 0`
- Mensal (dia 1 às 2h): `0 2 1 * *`

## Segurança

- A Edge Function usa `SERVICE_ROLE_KEY` para bypass RLS (necessário para deletar)
- Funções SQL usam `SECURITY DEFINER` para executar com privilégios elevados
- Logs de auditoria são mantidos para rastreabilidade

## Troubleshooting

### Função não executa
- Verifique se o Cron Job está ativo
- Verifique logs em **Edge Functions** > **Logs**
- Teste execução manual primeiro

### Erro de permissão
- Verifique se `SERVICE_ROLE_KEY` está configurada corretamente
- Verifique se a função SQL tem `SECURITY DEFINER`

### Performance lenta
- Verifique se os índices foram criados: `\d indicators` no psql
- Considere aumentar o período de retenção se houver muitos registros

## Benefícios

✅ **Reduz crescimento do banco**: Remove dados antigos automaticamente  
✅ **Mantém histórico**: 90 dias é suficiente para recuperação acidental  
✅ **Auditoria**: Logs registram todas as limpezas  
✅ **Automático**: Não requer intervenção manual  
✅ **Configurável**: Período de retenção pode ser ajustado  

# Edge Function: Limpeza Automática de Indicadores

Esta Edge Function remove permanentemente indicadores inativos (`is_active = false`) que foram atualizados há mais de 90 dias.

## Configuração

### 1. Deploy da Função

```bash
# No diretório raiz do projeto
supabase functions deploy cleanup-indicators
```

### 2. Configurar Variáveis de Ambiente

No Supabase Dashboard:
- Vá em **Edge Functions** > **cleanup-indicators** > **Settings**
- Adicione as variáveis:
  - `SUPABASE_URL`: URL do seu projeto
  - `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key (para bypass RLS)

### 3. Configurar Agendamento (Cron)

No Supabase Dashboard:
- Vá em **Edge Functions** > **cleanup-indicators** > **Cron Jobs**
- Adicione um novo cron job:
  - **Schedule**: `0 2 * * *` (todos os dias às 2h UTC)
  - **Function**: `cleanup-indicators`

### 4. Executar Manualmente (Opcional)

```bash
curl -X POST https://[seu-projeto].supabase.co/functions/v1/cleanup-indicators \
  -H "Authorization: Bearer [service-role-key]"
```

## Período de Retenção

Por padrão, a função mantém indicadores inativos por **90 dias** antes de deletá-los permanentemente.

Para alterar o período, edite a constante `RETENTION_DAYS` no arquivo `index.ts`.

## Logs

A função registra cada execução na tabela `indicators_cleanup_log` (se existir), incluindo:
- Data/hora da limpeza
- Quantidade de indicadores deletados
- IDs dos indicadores deletados
- Tempo de execução

## Monitoramento

Para verificar os logs de limpeza:

```sql
SELECT * FROM indicators_cleanup_log 
ORDER BY cleanup_date DESC 
LIMIT 10;
```

Para verificar quantos indicadores estão aguardando limpeza:

```sql
SELECT COUNT(*) as pending_cleanup
FROM indicators
WHERE is_active = false
  AND updated_at < NOW() - INTERVAL '90 days';
```

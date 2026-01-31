-- ============================================
-- MIGRATION: Limpeza Automática de Indicadores
-- ============================================
-- Implementa hard delete de indicadores inativos após 90 dias
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- 1. Adicionar índices para melhorar performance das queries
CREATE INDEX IF NOT EXISTS idx_indicators_is_active ON indicators(is_active);
CREATE INDEX IF NOT EXISTS idx_indicators_updated_at ON indicators(updated_at);
CREATE INDEX IF NOT EXISTS idx_indicators_is_active_updated_at ON indicators(is_active, updated_at);

-- 2. Criar função para limpar indicadores inativos há mais de 90 dias
CREATE OR REPLACE FUNCTION cleanup_inactive_indicators()
RETURNS TABLE(deleted_count BIGINT, deleted_ids UUID[]) AS $$
DECLARE
  retention_days INTEGER := 90; -- Período de retenção em dias (configurável)
  deleted_ids_array UUID[];
  deleted_count_result BIGINT;
BEGIN
  -- Coletar IDs dos indicadores que serão deletados (para log)
  SELECT ARRAY_AGG(id), COUNT(*)
  INTO deleted_ids_array, deleted_count_result
  FROM indicators
  WHERE is_active = false
    AND updated_at < NOW() - (retention_days || ' days')::INTERVAL;

  -- Deletar indicadores inativos há mais de 90 dias
  DELETE FROM indicators
  WHERE is_active = false
    AND updated_at < NOW() - (retention_days || ' days')::INTERVAL;

  -- Retornar resultado
  RETURN QUERY SELECT deleted_count_result, deleted_ids_array;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar função de log para auditoria (opcional mas recomendado)
CREATE TABLE IF NOT EXISTS indicators_cleanup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleanup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_count INTEGER NOT NULL,
  deleted_ids UUID[],
  retention_days INTEGER DEFAULT 90,
  execution_time_ms INTEGER
);

-- 4. Função melhorada com log
CREATE OR REPLACE FUNCTION cleanup_inactive_indicators_with_log()
RETURNS TABLE(deleted_count BIGINT, deleted_ids UUID[], log_id UUID) AS $$
DECLARE
  retention_days INTEGER := 90;
  deleted_ids_array UUID[];
  deleted_count_result BIGINT;
  start_time TIMESTAMP;
  execution_time INTEGER;
  log_entry_id UUID;
BEGIN
  start_time := clock_timestamp();

  -- Coletar IDs dos indicadores que serão deletados
  SELECT ARRAY_AGG(id), COUNT(*)
  INTO deleted_ids_array, deleted_count_result
  FROM indicators
  WHERE is_active = false
    AND updated_at < NOW() - (retention_days || ' days')::INTERVAL;

  -- Deletar indicadores inativos há mais de 90 dias
  DELETE FROM indicators
  WHERE is_active = false
    AND updated_at < NOW() - (retention_days || ' days')::INTERVAL;

  -- Calcular tempo de execução
  execution_time := EXTRACT(EPOCH FROM (clock_timestamp() - start_time) * 1000)::INTEGER;

  -- Registrar no log
  INSERT INTO indicators_cleanup_log (
    deleted_count,
    deleted_ids,
    retention_days,
    execution_time_ms
  ) VALUES (
    deleted_count_result,
    deleted_ids_array,
    retention_days,
    execution_time
  ) RETURNING id INTO log_entry_id;

  -- Retornar resultado
  RETURN QUERY SELECT deleted_count_result, deleted_ids_array, log_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Configurar agendamento automático (requer extensão pg_cron)
-- Descomente as linhas abaixo se tiver acesso à extensão pg_cron
-- Nota: pg_cron pode não estar disponível em todos os planos do Supabase

/*
-- Executar limpeza diariamente às 2h da manhã (UTC)
SELECT cron.schedule(
  'cleanup-inactive-indicators',
  '0 2 * * *', -- Cron expression: todos os dias às 2h
  $$SELECT cleanup_inactive_indicators_with_log();$$
);
*/

-- ============================================
-- INSTRUÇÕES DE USO:
-- ============================================
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Para executar manualmente a limpeza:
--    SELECT * FROM cleanup_inactive_indicators_with_log();
-- 3. Para verificar logs de limpeza:
--    SELECT * FROM indicators_cleanup_log ORDER BY cleanup_date DESC;
-- 4. Para configurar agendamento automático:
--    - Use Supabase Edge Functions com cron (recomendado)
--    - Ou habilite pg_cron se disponível no seu plano
-- ============================================

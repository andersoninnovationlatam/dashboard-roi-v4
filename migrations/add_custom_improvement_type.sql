-- ============================================
-- MIGRATION: Adicionar 'custom' ao improvement_type
-- ============================================
-- Atualiza a constraint CHECK para permitir o tipo 'custom'
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- 1. Remover a constraint antiga (se existir)
ALTER TABLE indicators 
DROP CONSTRAINT IF EXISTS indicators_improvement_type_check;

-- 2. Criar nova constraint incluindo 'custom'
ALTER TABLE indicators 
ADD CONSTRAINT indicators_improvement_type_check 
CHECK (improvement_type IN (
  'productivity',
  'revenue_increase',
  'margin_improvement',
  'analytical_capacity',
  'risk_reduction',
  'decision_quality',
  'speed',
  'satisfaction',
  'related_costs',
  'custom',
  'other'
));

-- ============================================
-- INSTRUÇÕES DE USO:
-- ============================================
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Após executar, o tipo 'custom' estará disponível
-- 3. Verifique se a constraint foi aplicada corretamente:
--    SELECT conname, pg_get_constraintdef(oid) 
--    FROM pg_constraint 
--    WHERE conrelid = 'indicators'::regclass 
--    AND conname = 'indicators_improvement_type_check';
-- ============================================

-- ============================================
-- FIX: Ajustar políticas RLS para ai_prompts
-- ============================================
-- Execute este SQL se estiver tendo problemas de permissão
-- ============================================

-- Remove políticas antigas
DROP POLICY IF EXISTS "Users can view prompts from their organization" ON ai_prompts;
DROP POLICY IF EXISTS "Managers can update prompts" ON ai_prompts;
DROP POLICY IF EXISTS "Managers can insert prompts" ON ai_prompts;

-- Política mais permissiva para SELECT (qualquer usuário da organização pode ver)
CREATE POLICY "Users can view prompts from their organization" ON ai_prompts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Política para UPDATE - permite admin e manager
CREATE POLICY "Managers can update prompts" ON ai_prompts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND organization_id = ai_prompts.organization_id
      AND role IN ('admin', 'manager')
    )
  );

-- Política para INSERT - permite admin e manager
CREATE POLICY "Managers can insert prompts" ON ai_prompts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND organization_id = ai_prompts.organization_id
      AND role IN ('admin', 'manager')
    )
  );

-- ============================================
-- VERSÃO ALTERNATIVA: Mais permissiva (para debug)
-- ============================================
-- Descomente as linhas abaixo se quiser permitir que qualquer usuário autenticado salve prompts
-- (útil para testar se o problema é de permissão)
-- ============================================

/*
-- Remove todas as políticas
DROP POLICY IF EXISTS "Users can view prompts from their organization" ON ai_prompts;
DROP POLICY IF EXISTS "Managers can update prompts" ON ai_prompts;
DROP POLICY IF EXISTS "Managers can insert prompts" ON ai_prompts;

-- Política permissiva para SELECT
CREATE POLICY "All authenticated users can view prompts" ON ai_prompts
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Política permissiva para UPDATE
CREATE POLICY "All authenticated users can update prompts" ON ai_prompts
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Política permissiva para INSERT
CREATE POLICY "All authenticated users can insert prompts" ON ai_prompts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
*/

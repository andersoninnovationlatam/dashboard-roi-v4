-- ============================================
-- MIGRATION: Atualizar políticas RLS para ai_prompts
-- Apenas admins podem editar prompts
-- Todos os usuários podem visualizar
-- ============================================
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view prompts from their organization" ON ai_prompts;
DROP POLICY IF EXISTS "Managers can update prompts" ON ai_prompts;
DROP POLICY IF EXISTS "Managers can insert prompts" ON ai_prompts;
DROP POLICY IF EXISTS "All authenticated users can view prompts" ON ai_prompts;
DROP POLICY IF EXISTS "All authenticated users can update prompts" ON ai_prompts;
DROP POLICY IF EXISTS "All authenticated users can insert prompts" ON ai_prompts;

-- Política para SELECT: Todos os usuários da organização podem ver o prompt
CREATE POLICY "Users can view prompts from their organization" ON ai_prompts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Política para UPDATE: Apenas admins podem atualizar prompts
CREATE POLICY "Only admins can update prompts" ON ai_prompts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND organization_id = ai_prompts.organization_id
      AND role = 'admin'
    )
  );

-- Política para INSERT: Apenas admins podem inserir prompts
CREATE POLICY "Only admins can insert prompts" ON ai_prompts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND organization_id = ai_prompts.organization_id
      AND role = 'admin'
    )
  );

-- Política para DELETE: Apenas admins podem deletar prompts (opcional)
DROP POLICY IF EXISTS "Only admins can delete prompts" ON ai_prompts;
CREATE POLICY "Only admins can delete prompts" ON ai_prompts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND organization_id = ai_prompts.organization_id
      AND role = 'admin'
    )
  );

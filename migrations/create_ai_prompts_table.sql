-- ============================================
-- MIGRATION: Criar tabela ai_prompts
-- ============================================
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- Tabela para armazenar prompts customizados de IA por organização
CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_prompts_organization ON ai_prompts(organization_id);

-- Trigger para atualizar updated_at automaticamente (assumindo que a função já existe)
DROP TRIGGER IF EXISTS update_ai_prompts_updated_at ON ai_prompts;
CREATE TRIGGER update_ai_prompts_updated_at 
  BEFORE UPDATE ON ai_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS para ai_prompts
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para ai_prompts
-- Usuários podem ver prompts da sua organização
DROP POLICY IF EXISTS "Users can view prompts from their organization" ON ai_prompts;
CREATE POLICY "Users can view prompts from their organization" ON ai_prompts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Apenas admins e managers podem atualizar prompts
DROP POLICY IF EXISTS "Managers can update prompts" ON ai_prompts;
CREATE POLICY "Managers can update prompts" ON ai_prompts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND organization_id = ai_prompts.organization_id
      AND role IN ('admin', 'manager')
    )
  );

-- Apenas admins e managers podem inserir prompts
DROP POLICY IF EXISTS "Managers can insert prompts" ON ai_prompts;
CREATE POLICY "Managers can insert prompts" ON ai_prompts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND organization_id = ai_prompts.organization_id
      AND role IN ('admin', 'manager')
    )
  );

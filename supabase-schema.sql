-- ============================================
-- SCHEMA DE AUTENTICAÇÃO E PERFIS DE USUÁRIO
-- ROI Analytics Pro - Supabase
-- ============================================
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- Tabela de perfis de usuário (extensão do auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'analyst', 'viewer')),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  phone TEXT,
  position TEXT,
  department TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at em user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS para user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Função para criar perfil automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- TABELA DE PROMPTS DE IA
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

-- Trigger para atualizar updated_at automaticamente
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

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Certifique-se de que a tabela 'organizations' já existe
-- 2. As políticas RLS permitem que usuários vejam e editem apenas seu próprio perfil
-- 3. O trigger cria automaticamente um perfil quando um novo usuário se cadastra
-- 4. O role padrão é 'viewer' se não especificado no signup
-- 5. Os prompts de IA são armazenados por organização (um prompt por organização)
-- 6. Apenas admins e managers podem criar/editar prompts
-- ============================================

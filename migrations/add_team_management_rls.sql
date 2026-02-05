-- ============================================
-- MIGRATION: Políticas RLS para Gestão de Equipe
-- ============================================
-- Execute este SQL no SQL Editor do Supabase
-- ============================================
-- Esta migration adiciona políticas que permitem que admins e managers
-- vejam e gerenciem membros da mesma organização
-- ============================================

-- Política para SELECT: Admins e Managers podem ver todos os membros da organização
DROP POLICY IF EXISTS "Admins and managers can view organization members" ON user_profiles;
CREATE POLICY "Admins and managers can view organization members" ON user_profiles
  FOR SELECT USING (
    -- Usuário pode ver seu próprio perfil
    auth.uid() = id
    OR
    -- OU usuário é admin/manager da mesma organização
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

-- Política para UPDATE: Admins e Managers podem atualizar membros da organização
DROP POLICY IF EXISTS "Admins and managers can update organization members" ON user_profiles;
CREATE POLICY "Admins and managers can update organization members" ON user_profiles
  FOR UPDATE USING (
    -- Usuário pode atualizar seu próprio perfil
    auth.uid() = id
    OR
    -- OU usuário é admin/manager da mesma organização
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

-- Política para INSERT: Admins e Managers podem adicionar membros à organização
-- Nota: Esta política permite inserir perfis mesmo sem auth.users (para convites)
DROP POLICY IF EXISTS "Admins and managers can insert organization members" ON user_profiles;
CREATE POLICY "Admins and managers can insert organization members" ON user_profiles
  FOR INSERT WITH CHECK (
    -- Usuário pode inserir seu próprio perfil
    auth.uid() = id
    OR
    -- OU usuário é admin/manager e está adicionando à mesma organização
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

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. As políticas permitem que admins e managers vejam e gerenciem
--    todos os membros da mesma organização
-- 2. Usuários comuns (viewer, analyst) só podem ver e editar seu próprio perfil
-- 3. A política de INSERT permite criar perfis para convites mesmo sem auth.users
-- 4. Certifique-se de que a tabela 'organizations' existe antes de executar
-- ============================================

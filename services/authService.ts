import { supabase } from './supabase';
import { UserRole } from '../types';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  organization_id: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export const authService = {
  // Login com email e senha
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  // Cadastro de novo usuário
  async signUp(
    email: string,
    password: string,
    fullName: string,
    organizationName: string,
    role: UserRole = UserRole.ADMIN // Primeiro usuário é admin
  ) {
    // 1. Criar usuário no Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
          organization_name: organizationName, // Passar no metadata
        },
      },
    });

    if (error) throw error;

    // 2. Criar organização
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: organizationName,
      })
      .select()
      .single();

    if (orgError) {
      console.error('Erro ao criar organização:', orgError);
      throw new Error('Erro ao criar organização. Tente novamente.');
    }

    // 3. Aguardar um pouco para o trigger criar o perfil
    // Depois atualizar o perfil com organization_id e role de admin
    if (data.user) {
      // Aguardar trigger executar
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          organization_id: orgData.id,
          role: role, // Primeiro usuário é admin
        })
        .eq('id', data.user.id);

      if (profileError) {
        console.error('Erro ao atualizar perfil com organização:', profileError);
        // Não falhar completamente, mas logar o erro
      }
    }

    return data;
  },

  // Logout
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Obter usuário atual
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Obter perfil do usuário
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Atualizar perfil do usuário
  async updateUserProfile(userId: string, updates: Partial<UserProfile>) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        full_name: updates.full_name,
        phone: updates.phone,
        position: updates.position,
        department: updates.department,
        organization_id: updates.organization_id,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Atualizar senha
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  },

  // Reset de senha (envia email)
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  },

  // Listener de mudanças de autenticação
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },

  // Criar novo usuário (apenas para admins)
  async createUser(
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    organizationId: string
  ) {
    // Verificar se o usuário já existe
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_team_user', {
      p_email: email.trim().toLowerCase(),
      p_password: password,
      p_full_name: fullName,
      p_role: role,
      p_organization_id: organizationId,
    });

    if (rpcError) throw rpcError;

    // Se o usuário não existe, criar via signUp
    if (rpcData?.requires_signup) {
      // Criar usuário via signUp (isso cria no auth.users)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (signUpError) throw signUpError;

      // Aguardar trigger criar o perfil
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Atualizar perfil com organization_id e role
      if (signUpData.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({
            organization_id: organizationId,
            role: role,
            full_name: fullName,
          })
          .eq('id', signUpData.user.id);

        if (profileError) {
          console.error('Erro ao atualizar perfil:', profileError);
          throw new Error('Erro ao atualizar perfil do usuário');
        }
      }

      return { success: true, user: signUpData.user };
    }

    return rpcData;
  },

  // Remover usuário da organização (apenas para admins)
  async removeUser(userId: string, organizationId: string) {
    // Verificar se o usuário pertence à organização
    const { data: userProfile, error: checkError } = await supabase
      .from('user_profiles')
      .select('id, organization_id, role')
      .eq('id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (checkError || !userProfile) {
      throw new Error('Usuário não encontrado na organização');
    }

    // Não permitir remover o último admin da organização
    const { count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('role', UserRole.ADMIN);

    if (userProfile.role === UserRole.ADMIN && count && count <= 1) {
      throw new Error('Não é possível remover o último administrador da organização');
    }

    // Usar função RPC para remover usuário
    const { data, error } = await supabase.rpc('remove_team_user', {
      p_user_id: userId,
      p_organization_id: organizationId,
    });

    if (error) throw error;
    return data;
  },
};

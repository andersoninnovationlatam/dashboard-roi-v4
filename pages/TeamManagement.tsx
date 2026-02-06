import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { UserProfile, authService } from '../services/authService';
import { UserRole } from '../types';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';

const TeamManagement: React.FC = () => {
  const { profile } = useAuth();
  const { toasts, showToast, removeToast } = useToast();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<UserRole>(UserRole.VIEWER);
  const [organizationName, setOrganizationName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.organization_id) {
      loadMembers();
      loadOrganizationName();
    }
  }, [profile]);

  const loadOrganizationName = async () => {
    if (!profile?.organization_id) return;

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', profile.organization_id)
        .single();

      if (error) throw error;
      if (data) setOrganizationName(data.name);
    } catch (error) {
      console.error('Erro ao carregar nome da organização:', error);
    }
  };

  const loadMembers = async () => {
    if (!profile?.organization_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar membros:', error);
      showToast('Erro ao carregar membros da equipe', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) {
      showToast('Organização não encontrada', 'error');
      return;
    }

    if (!newMemberEmail.trim()) {
      showToast('Por favor, informe um e-mail válido', 'error');
      return;
    }

    try {
      setAddingMember(true);
      const email = newMemberEmail.trim().toLowerCase();

      // Verificar se o usuário já existe na organização atual antes de chamar a função
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id, email, role, organization_id')
        .eq('email', email)
        .maybeSingle();

      let shouldSendWelcomeEmail = false;
      let shouldSendRoleChangeEmail = false;
      let oldRole: UserRole | undefined;
      let isNewUser = false;

      // Se o usuário já existe na mesma organização com a mesma função, apenas informar
      if (existingUser && existingUser.organization_id === profile.organization_id) {
        if (existingUser.role === newMemberRole) {
          showToast('Este membro já está na equipe com esta função', 'info');
          setNewMemberEmail('');
          setNewMemberRole(UserRole.VIEWER);
          setAddingMember(false);
          return;
        } else {
          // Apenas atualizar a função via UPDATE direto (mais simples)
          oldRole = existingUser.role as UserRole;
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ role: newMemberRole })
            .eq('id', existingUser.id);

          if (updateError) throw updateError;
          shouldSendRoleChangeEmail = true;
        }
      } else {
        // Usar função stored procedure para adicionar/atualizar membro
        const { data: rpcResult, error: rpcError } = await supabase.rpc('add_team_member', {
          p_email: email,
          p_organization_id: profile.organization_id,
          p_role: newMemberRole,
        });

        if (rpcError) {
          // Se o erro for que o usuário não existe, mostrar mensagem informativa
          if (
            rpcError.message?.includes('não encontrado') ||
            rpcError.message?.includes('not found') ||
            rpcError.message?.includes('precisa estar cadastrado')
          ) {
            showToast(
              'Usuário não encontrado. O e-mail precisa estar cadastrado no sistema primeiro. Peça para o usuário criar uma conta.',
              'warning'
            );
            setNewMemberEmail('');
            setNewMemberRole(UserRole.VIEWER);
            setAddingMember(false);
            return;
          }
          throw rpcError;
        }

        const result = rpcResult as { success: boolean; type: 'existing_user' | 'new_user' };
        // A função retorna 'existing_user' quando atualiza um usuário existente
        isNewUser = result.type !== 'existing_user';

        if (isNewUser) {
          shouldSendWelcomeEmail = true;
        } else {
          // Se é usuário existente mas de outra organização, buscar role antiga
          if (existingUser) {
            oldRole = existingUser.role as UserRole;
          }
          shouldSendRoleChangeEmail = true;
        }
      }

      // Se for um novo usuário, gerar token de reset de senha
      if (isNewUser && shouldSendWelcomeEmail) {
        try {
          await authService.resetPassword(email);
        } catch (resetError: any) {
          // Se o usuário não existe no auth ainda, não é erro crítico
          // O token será gerado quando ele se cadastrar
          console.warn('Não foi possível gerar token de reset (usuário pode não estar no auth ainda):', resetError);
        }
      }

      // Enviar e-mail via Edge Function
      if (shouldSendWelcomeEmail) {
        try {
          await sendEmail({
            to: email,
            type: 'welcome',
            organizationName: organizationName || 'sua organização',
          });
          showToast('Membro adicionado e e-mail de boas-vindas enviado', 'success');
        } catch (emailError: any) {
          console.error('Erro ao enviar e-mail de boas-vindas:', emailError);
          showToast('Membro adicionado, mas houve erro ao enviar e-mail', 'warning');
        }
      } else if (shouldSendRoleChangeEmail && oldRole) {
        try {
          await sendEmail({
            to: email,
            type: 'role_change',
            organizationName: organizationName || 'sua organização',
            oldRole: getRoleLabel(oldRole),
            newRole: getRoleLabel(newMemberRole),
          });
          showToast('Função atualizada e e-mail enviado', 'success');
        } catch (emailError: any) {
          console.error('Erro ao enviar e-mail de mudança de função:', emailError);
          showToast('Função atualizada, mas houve erro ao enviar e-mail', 'warning');
        }
      }

      // Recarregar lista
      await loadMembers();
      setNewMemberEmail('');
      setNewMemberRole(UserRole.VIEWER);
    } catch (error: any) {
      console.error('Erro ao adicionar membro:', error);
      showToast(error.message || 'Erro ao adicionar membro', 'error');
    } finally {
      setAddingMember(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) {
      showToast('Organização não encontrada', 'error');
      return;
    }

    if (!newMemberEmail.trim() || !newMemberName.trim()) {
      showToast('Por favor, preencha todos os campos', 'error');
      return;
    }

    try {
      setAddingMember(true);
      const email = newMemberEmail.trim().toLowerCase();
      const fullName = newMemberName.trim();

      // Gerar senha temporária (será alterada via reset password)
      const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;

      // Criar usuário via authService.createUser (que usa create_team_user RPC)
      await authService.createUser(
        email,
        tempPassword,
        fullName,
        newMemberRole,
        profile.organization_id
      );

      // Gerar token de reset de senha para o novo usuário
      try {
        await authService.resetPassword(email);
      } catch (resetError: any) {
        console.warn('Não foi possível gerar token de reset:', resetError);
      }

      // Enviar e-mail de boas-vindas via Edge Function
      try {
        await sendEmail({
          to: email,
          type: 'welcome',
          organizationName: organizationName || 'sua organização',
        });
        showToast('Usuário criado com sucesso. E-mail de boas-vindas enviado.', 'success');
      } catch (emailError: any) {
        console.error('Erro ao enviar e-mail de boas-vindas:', emailError);
        showToast('Usuário criado com sucesso, mas houve erro ao enviar e-mail', 'warning');
      }

      await loadMembers();
      setNewMemberEmail('');
      setNewMemberName('');
      setNewMemberRole(UserRole.VIEWER);
      setShowCreateForm(false);
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      showToast(error.message || 'Erro ao criar usuário', 'error');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!profile?.organization_id) {
      showToast('Organização não encontrada', 'error');
      return;
    }

    if (!confirm('Tem certeza que deseja remover este usuário da organização?')) {
      return;
    }

    try {
      setRemovingUserId(userId);
      await authService.removeUser(userId, profile.organization_id);
      showToast('Usuário removido com sucesso', 'success');
      await loadMembers();
    } catch (error: any) {
      showToast(error.message || 'Erro ao remover usuário', 'error');
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: UserRole) => {
    try {
      const member = members.find((m) => m.id === memberId);
      if (!member) {
        showToast('Membro não encontrado', 'error');
        return;
      }

      const oldRole = member.role as UserRole;

      // Se a função não mudou, não fazer nada
      if (oldRole === newRole) {
        return;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      // Enviar e-mail de troca de função via Edge Function
      try {
        await sendEmail({
          to: member.email,
          type: 'role_change',
          organizationName: organizationName || 'sua organização',
          oldRole: getRoleLabel(oldRole),
          newRole: getRoleLabel(newRole),
        });
        showToast('Função atualizada e e-mail enviado', 'success');
      } catch (emailError: any) {
        console.error('Erro ao enviar e-mail de mudança de função:', emailError);
        showToast('Função atualizada, mas houve erro ao enviar e-mail', 'warning');
      }

      await loadMembers();
    } catch (error: any) {
      console.error('Erro ao atualizar função:', error);
      showToast(error.message || 'Erro ao atualizar função', 'error');
    }
  };

  const sendEmail = async (payload: {
    to: string;
    type: 'welcome' | 'role_change';
    organizationName?: string;
    oldRole?: string;
    newRole?: string;
  }) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Erro ao obter sessão:', sessionError);
        throw new Error('Erro ao obter sessão do usuário');
      }

      if (!session?.access_token) {
        console.error('Token de acesso não encontrado na sessão');
        throw new Error('Sessão não encontrada. Faça login novamente.');
      }

      const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        console.error('VITE_SUPABASE_URL não configurada');
        throw new Error('Configuração do Supabase não encontrada');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        console.error('Erro na resposta da Edge Function:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(errorData.message || `Erro ao enviar e-mail: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Erro ao enviar e-mail via Edge Function:', {
        error: error.message,
        stack: error.stack,
        payload,
      });
      throw error;
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      manager: 'Gerente',
      analyst: 'Analista',
      viewer: 'Visualizador',
    };
    return labels[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      analyst: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      viewer: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400',
    };
    return colors[role] || colors.viewer;
  };

  const canManageTeam = profile?.role === UserRole.ADMIN || profile?.role === UserRole.MANAGER;
  const isAdmin = profile?.role === UserRole.ADMIN;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-indigo-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-slate-500 dark:text-slate-400 font-bold">Carregando membros...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-widest">
              Gestão de Equipe
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Gerencie os membros da sua organização
            </p>
          </div>
        </div>

        {canManageTeam && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {showCreateForm ? 'Criar Novo Usuário' : 'Adicionar Membro Existente'}
              </h2>
              {isAdmin && (
                <button
                  onClick={() => {
                    setShowCreateForm(!showCreateForm);
                    setNewMemberEmail('');
                    setNewMemberName('');
                    setNewMemberRole(UserRole.VIEWER);
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold"
                >
                  {showCreateForm ? 'Adicionar Existente' : 'Criar Novo Usuário'}
                </button>
              )}
            </div>

            {showCreateForm && isAdmin ? (
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="João Silva"
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="exemplo@empresa.com"
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Função
                  </label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as UserRole)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value={UserRole.VIEWER}>Visualizador</option>
                    <option value={UserRole.ANALYST}>Analista</option>
                    <option value={UserRole.MANAGER}>Gerente</option>
                    <option value={UserRole.ADMIN}>Administrador</option>
                  </select>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                  <p className="text-sm text-indigo-800 dark:text-indigo-300">
                    <strong>Nota:</strong> O usuário receberá um e-mail de boas-vindas com um link para definir sua senha inicial.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingMember ? 'Criando...' : 'Criar Usuário'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAddMember} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="exemplo@empresa.com"
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Função
                    </label>
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as UserRole)}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value={UserRole.VIEWER}>Visualizador</option>
                      <option value={UserRole.ANALYST}>Analista</option>
                      <option value={UserRole.MANAGER}>Gerente</option>
                      <option value={UserRole.ADMIN}>Administrador</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingMember ? 'Adicionando...' : 'Adicionar Membro'}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Membros da Equipe ({members.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    E-mail
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Função
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Departamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Data de Entrada
                  </th>
                  {canManageTeam && (
                    <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={canManageTeam ? 6 : 5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                      Nenhum membro encontrado
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {member.full_name || 'Sem nome'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-600 dark:text-slate-400">{member.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getRoleBadgeColor(
                            member.role
                          )}`}
                        >
                          {getRoleLabel(member.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {member.department || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(member.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      {canManageTeam && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <select
                              value={member.role}
                              onChange={(e) => handleUpdateRole(member.id, e.target.value as UserRole)}
                              className="text-sm px-3 py-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                              <option value={UserRole.VIEWER}>Visualizador</option>
                              <option value={UserRole.ANALYST}>Analista</option>
                              <option value={UserRole.MANAGER}>Gerente</option>
                              <option value={UserRole.ADMIN}>Administrador</option>
                            </select>
                            {isAdmin && member.id !== profile?.id && (
                              <button
                                onClick={() => handleRemoveUser(member.id)}
                                disabled={removingUserId === member.id}
                                className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Remover usuário"
                              >
                                {removingUserId === member.id ? '...' : 'Remover'}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default TeamManagement;

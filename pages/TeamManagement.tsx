import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { UserProfile } from '../services/authService';
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
  const [newMemberRole, setNewMemberRole] = useState<UserRole>(UserRole.VIEWER);
  const [organizationName, setOrganizationName] = useState('');

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

      // Verificar se o usuário já existe na organização atual antes de chamar a função
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id, email, role, organization_id')
        .eq('email', newMemberEmail.trim().toLowerCase())
        .single();

      let emailType: 'welcome' | 'role_change' = 'welcome';

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
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ role: newMemberRole })
            .eq('id', existingUser.id);

          if (updateError) throw updateError;
          emailType = 'role_change';
          showToast('Função do membro atualizada com sucesso', 'success');
        }
      } else {
        // Usar função stored procedure para adicionar/atualizar membro
        const { data: rpcResult, error: rpcError } = await supabase.rpc('add_team_member', {
          p_email: newMemberEmail.trim().toLowerCase(),
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

        const result = rpcResult as { success: boolean; type: 'existing_user' };
        // A função retorna 'existing_user' quando atualiza um usuário existente
        emailType = result.type === 'existing_user' ? 'role_change' : 'welcome';
      }

      // Enviar e-mail via API
      try {
        const response = await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: newMemberEmail.trim().toLowerCase(),
            type: emailType,
            organizationName: organizationName || 'sua organização',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Erro ao enviar e-mail:', errorData);
          // Não falhar a operação se o e-mail falhar
          showToast('Membro adicionado, mas houve erro ao enviar e-mail', 'warning');
        } else {
          showToast(
            emailType === 'welcome'
              ? 'Membro adicionado e e-mail de boas-vindas enviado'
              : 'E-mail de troca de função enviado',
            'success'
          );
        }
      } catch (emailError) {
        console.error('Erro ao enviar e-mail:', emailError);
        showToast('Membro adicionado, mas houve erro ao enviar e-mail', 'warning');
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

  const handleUpdateRole = async (memberId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      // Enviar e-mail de troca de função
      const member = members.find((m) => m.id === memberId);
      if (member) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: member.email,
              type: 'role_change',
              organizationName: organizationName || 'sua organização',
            }),
          });
        } catch (emailError) {
          console.error('Erro ao enviar e-mail:', emailError);
        }
      }

      showToast('Função atualizada com sucesso', 'success');
      await loadMembers();
    } catch (error: any) {
      console.error('Erro ao atualizar função:', error);
      showToast(error.message || 'Erro ao atualizar função', 'error');
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
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Adicionar Novo Membro</h2>
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

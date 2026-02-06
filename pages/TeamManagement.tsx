import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';
import ConfirmModal from '../components/ConfirmModal';
import { useConfirm } from '../hooks/useConfirm';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  department?: string | null;
  created_at: string;
}

const TeamManagement: React.FC = () => {
  const { profile } = useAuth();
  const { toasts, showToast, removeToast } = useToast();
  const { confirmState, confirm, handleCancel } = useConfirm();

  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.VIEWER);
  const [organizationName, setOrganizationName] = useState('');

  const canManage =
    profile?.role === UserRole.ADMIN || profile?.role === UserRole.MANAGER;

  useEffect(() => {
    if (profile?.organization_id) {
      loadMembers();
      loadOrganization();
    }
  }, [profile]);

  async function loadOrganization() {
    const { data } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile?.organization_id)
      .single();

    if (data?.name) setOrganizationName(data.name);
  }

  async function loadMembers() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('organization_id', profile?.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar membros', 'error');
    } finally {
      setLoading(false);
    }
  }

  /**
   * 🚀 ÚNICO FLUXO DE ADIÇÃO DE USUÁRIO
   */
  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      showToast('Informe um e-mail válido', 'error');
      return;
    }

    setAdding(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // 1️⃣ Pegar sessão atual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Usuário não está logado');
      }

      // 2️⃣ Criar cliente admin (service_role) para criar usuário se não existir
      // @ts-expect-error - Vite env variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      // @ts-expect-error - Vite env variables
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Variáveis de ambiente do Supabase não configuradas');
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

      // 3️⃣ Verificar se o usuário já existe no Auth
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const users = usersData?.users || [];
      const existingUser = users.find((u: any) => u.email === normalizedEmail);

      if (!existingUser) {
        // 4️⃣ Criar usuário no Auth com senha temporária
        const passwordTemp = Math.random().toString(36).slice(-8);
        const { error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password: passwordTemp,
          email_confirm: false, // usuário confirmará com o convite
        });
        if (createError) throw createError;
      }

      // 5️⃣ Chamar RPC para adicionar no user_profiles
      const { error: rpcError } = await supabase.rpc('add_team_member', {
        p_email: normalizedEmail,
        p_organization_id: profile?.organization_id,
        p_role: role,
        p_full_name: fullName.trim() || null,
      });
      if (rpcError) throw rpcError;

      // 6️⃣ Enviar e-mail de convite via Edge Function
      const res = await fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          to: normalizedEmail,
          type: 'welcome',
          organizationName: organizationName || 'ROI Analytics',
          fullName: fullName,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao enviar e-mail');
      }

      showToast('Usuário adicionado e convite enviado', 'success');
      setEmail('');
      setFullName('');
      setRole(UserRole.VIEWER);
      await loadMembers();
    } catch (err: any) {
      console.error(err);

      // Tratar mensagens específicas
      if (err.message.includes('already been registered')) {
        showToast('Usuário já existe no sistema. Convite reenviado.', 'info');
      } else if (err.message.includes('Usuário não encontrado')) {
        showToast('Erro interno: usuário não foi criado no Auth', 'error');
      } else {
        showToast(err.message || 'Erro ao adicionar usuário', 'error');
      }
    } finally {
      setAdding(false);
    }
  }

  /**
   * 🗑️ DELETAR USUÁRIO (auth.users + user_profiles)
   */
  async function handleDeleteMember(member: UserProfile) {
    const confirmed = await confirm({
      title: 'Excluir Usuário',
      message: `Tem certeza que deseja excluir o usuário "${member.full_name || member.email}"? Esta ação não pode ser desfeita e removerá o usuário do sistema.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      // 1️⃣ Pegar variáveis de ambiente
      // @ts-expect-error - Vite env variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      // @ts-expect-error - Vite env variables
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Variáveis de ambiente do Supabase não configuradas');
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

      // 2️⃣ Deletar do user_profiles primeiro
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', member.id);

      if (profileError) throw profileError;

      // 3️⃣ Buscar o auth user pelo email e deletar do auth.users
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const users = usersData?.users || [];
      const authUser = users.find((u: any) => u.email === member.email);

      if (authUser) {
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);
        if (deleteAuthError) throw deleteAuthError;
      }

      showToast('Usuário excluído com sucesso', 'success');
      await loadMembers();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erro ao excluir usuário', 'error');
    }
  }

  function roleLabel(role: UserRole) {
    const map = {
      admin: 'Administrador',
      manager: 'Gerente',
      analyst: 'Analista',
      viewer: 'Visualizador',
    };
    return map[role];
  }

  if (loading) {
    return <div className="p-10 text-center">Carregando equipe…</div>;
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
        onConfirm={() => {
          if (confirmState.onConfirm) {
            confirmState.onConfirm();
          }
        }}
        onCancel={handleCancel}
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black uppercase">Gestão de Equipe</h1>
          <p className="text-slate-500">
            Adicione membros à sua organização
          </p>
        </div>

        {canManage && (
          <form
            onSubmit={handleAddMember}
            className="bg-white dark:bg-slate-900 p-6 rounded-xl border space-y-4 border-slate-100 dark:border-slate-800"
          >
            <div className='flex gap-4'>
              <div className="flex-1">
                <label className='font-bold text-sm'>Nome Usuario</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="font-bold text-sm">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-sm">Função</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={UserRole.VIEWER}>Visualizador</option>
                <option value={UserRole.ANALYST}>Analista</option>
                <option value={UserRole.MANAGER}>Gerente</option>
                <option value={UserRole.ADMIN}>Administrador</option>
              </select>
            </div>

            <p className="text-sm text-slate-500">
              O usuário receberá um e-mail para criar a senha e acessar a
              plataforma.
            </p>

            <button
              type="submit"
              disabled={adding}
              className={`px-6 py-2 font-bold rounded transition-colors ${adding
                  ? 'bg-amber-500 dark:bg-amber-600 text-white cursor-wait'
                  : 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600'
                }`}
            >
              {adding ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adicionando…
                </span>
              ) : (
                'Adicionar usuário'
              )}
            </button>
          </form>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden border-slate-100 dark:border-slate-800">
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="p-3 text-left text-slate-900 dark:text-slate-100">Nome</th>
                <th className="p-3 text-left text-slate-900 dark:text-slate-100">E-mail</th>
                <th className="p-3 text-left text-slate-900 dark:text-slate-100">Função</th>
                <th className="p-3 text-left text-slate-900 dark:text-slate-100">Entrada</th>
                {canManage && (
                  <th className="p-3 text-left text-slate-900 dark:text-slate-100">Ações</th>
                )}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-3">{m.full_name || '—'}</td>
                  <td className="p-3">{m.email}</td>
                  <td className="p-3">{roleLabel(m.role)}</td>
                  <td className="p-3">
                    {new Date(m.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  {canManage && (
                    <td className="p-3">
                      <button
                        onClick={() => handleDeleteMember(m)}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Excluir usuário"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default TeamManagement;

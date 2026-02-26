import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auditService, ActivityFilters } from '../services/auditService';
import { UserActivity, ActivityType, EntityType } from '../types';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';

const ActivityLog: React.FC = () => {
  const { profile } = useAuth();
  const { toasts, showToast, removeToast } = useToast();

  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    byType: {} as Record<ActivityType, number>,
    byUser: [] as Array<{ user_email: string; user_name: string | null; count: number }>,
  });

  // Filtros
  const [filters, setFilters] = useState<ActivityFilters>({
    limit: 50,
    offset: 0,
  });
  const [selectedActivityType, setSelectedActivityType] = useState<ActivityType | ''>('');
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    // Verificar se o usuário está autorizado
    if (!profile?.email || !auditService.isAuthorizedUser(profile.email)) {
      showToast('Você não tem permissão para acessar esta página', 'error');
      return;
    }

    loadActivities();
    loadStats();
  }, [profile, filters]);

  const loadActivities = async () => {
    try {
      setLoading(true);

      const activityFilters: ActivityFilters = {
        ...filters,
        activityType: selectedActivityType || undefined,
        entityType: selectedEntityType || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const data = await auditService.getActivities(activityFilters);
      setActivities(data);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
      showToast('Erro ao carregar atividades', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await auditService.getActivityStats({
        activityType: selectedActivityType || undefined,
        entityType: selectedEntityType || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      setStats({
        total: statsData.total,
        byType: statsData.byType,
        byUser: statsData.byUser,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleFilterChange = () => {
    setFilters({ ...filters, offset: 0 });
    loadActivities();
    loadStats();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getActivityTypeLabel = (type: ActivityType) => {
    const labels: Record<ActivityType, string> = {
      [ActivityType.LOGIN]: 'Login',
      [ActivityType.LOGOUT]: 'Logout',
      [ActivityType.PROJECT_CREATE]: 'Criar Projeto',
      [ActivityType.PROJECT_UPDATE]: 'Atualizar Projeto',
      [ActivityType.PROJECT_DELETE]: 'Excluir Projeto',
      [ActivityType.INDICATOR_CREATE]: 'Criar Indicador',
      [ActivityType.INDICATOR_UPDATE]: 'Atualizar Indicador',
      [ActivityType.INDICATOR_DELETE]: 'Excluir Indicador',
    };
    return labels[type] || type;
  };

  const getActivityTypeColor = (type: ActivityType) => {
    const colors: Record<ActivityType, string> = {
      [ActivityType.LOGIN]: 'bg-green-500/20 text-green-500',
      [ActivityType.LOGOUT]: 'bg-slate-500/20 text-slate-500',
      [ActivityType.PROJECT_CREATE]: 'bg-blue-500/20 text-blue-500',
      [ActivityType.PROJECT_UPDATE]: 'bg-yellow-500/20 text-yellow-500',
      [ActivityType.PROJECT_DELETE]: 'bg-red-500/20 text-red-500',
      [ActivityType.INDICATOR_CREATE]: 'bg-indigo-500/20 text-indigo-500',
      [ActivityType.INDICATOR_UPDATE]: 'bg-purple-500/20 text-purple-500',
      [ActivityType.INDICATOR_DELETE]: 'bg-pink-500/20 text-pink-500',
    };
    return colors[type] || 'bg-slate-500/20 text-slate-500';
  };

  if (!profile?.email || !auditService.isAuthorizedUser(profile.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-4">
            Acesso Negado
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-2">
            Log de Atividades
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Registro completo de todas as atividades dos usuários na plataforma
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">
            Total de Atividades
          </p>
          <p className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {stats.total.toLocaleString('pt-BR')}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">
            Tipos de Atividade
          </p>
          <p className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {Object.keys(stats.byType).length}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">
            Usuários Ativos
          </p>
          <p className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {stats.byUser.length}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">
            Últimas 24h
          </p>
          <p className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {activities.filter(a => {
              const activityDate = new Date(a.created_at);
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              return activityDate >= yesterday;
            }).length}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-4">
          Filtros
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Tipo de Atividade
            </label>
            <select
              value={selectedActivityType}
              onChange={(e) => setSelectedActivityType(e.target.value as ActivityType | '')}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              {Object.values(ActivityType).map((type) => (
                <option key={type} value={type}>
                  {getActivityTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Tipo de Entidade
            </label>
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value as EntityType | '')}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Todas</option>
              {Object.values(EntityType).map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Data Final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleFilterChange}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-500 transition-colors"
          >
            Aplicar Filtros
          </button>
          <button
            onClick={() => {
              setSelectedActivityType('');
              setSelectedEntityType('');
              setStartDate('');
              setEndDate('');
              setFilters({ ...filters, offset: 0 });
              setTimeout(() => {
                loadActivities();
                loadStats();
              }, 100);
            }}
            className="px-6 py-2 bg-slate-600 text-white rounded-lg font-bold hover:bg-slate-500 transition-colors"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Tabela de Atividades */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
            Atividades Registradas
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-slate-500 dark:text-slate-400 font-bold">Carregando atividades...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 dark:text-slate-400 font-bold">Nenhuma atividade encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Data/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 w-1/6">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 w-1/6">
                    Entidade
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {activities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                      {formatDate(activity.created_at)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {activity.user_name || 'Sem nome'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {activity.user_email}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getActivityTypeColor(activity.activity_type)}`}>
                        {getActivityTypeLabel(activity.activity_type)}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-slate-900 dark:text-slate-100 w-1/6">
                      {activity.activity_description}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 w-1/6">
                      {activity.entity_name ? (
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{activity.entity_name}</p>
                          <p className="text-xs">{activity.entity_type}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;

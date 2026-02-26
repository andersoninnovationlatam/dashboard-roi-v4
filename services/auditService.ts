import { supabase } from './supabase';
import { UserActivity, ActivityType, EntityType, AUDIT_AUTHORIZED_EMAILS } from '../types';

export interface ActivityFilters {
  userId?: string;
  activityType?: ActivityType;
  entityType?: EntityType;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface ActivityStats {
  total: number;
  byType: Record<ActivityType, number>;
  byUser: Array<{ user_email: string; user_name: string | null; count: number }>;
  recentActivities: UserActivity[];
}

export const auditService = {
  /**
   * Verifica se o usuário atual está autorizado a visualizar logs de auditoria
   */
  isAuthorizedUser(userEmail: string | null | undefined): boolean {
    if (!userEmail) return false;
    return AUDIT_AUTHORIZED_EMAILS.includes(userEmail.toLowerCase());
  },

  /**
   * Registra uma atividade no log de auditoria
   */
  async logActivity(
    userId: string,
    userEmail: string,
    userName: string | null,
    activityType: ActivityType,
    activityDescription: string,
    options?: {
      entityType?: EntityType;
      entityId?: string;
      entityName?: string;
      metadata?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    try {
      // Não bloquear a operação principal se o log falhar
      const { error } = await supabase.from('user_activities').insert({
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        activity_type: activityType,
        activity_description: activityDescription,
        entity_type: options?.entityType || null,
        entity_id: options?.entityId || null,
        entity_name: options?.entityName || null,
        metadata: options?.metadata || {},
        ip_address: options?.ipAddress || null,
        user_agent: options?.userAgent || null,
      });

      if (error) {
        // Log error but don't throw - audit logging should not break main functionality
        console.error('Erro ao registrar atividade de auditoria:', error);
      }
    } catch (error) {
      // Silently fail - audit logging should not break main functionality
      console.error('Erro ao registrar atividade de auditoria:', error);
    }
  },

  /**
   * Busca atividades de auditoria (apenas para usuários autorizados)
   */
  async getActivities(filters?: ActivityFilters): Promise<UserActivity[]> {
    let query = supabase
      .from('user_activities')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.activityType) {
      query = query.eq('activity_type', filters.activityType);
    }

    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }

    if (filters?.entityId) {
      query = query.eq('entity_id', filters.entityId);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as UserActivity[];
  },

  /**
   * Busca atividades por usuário
   */
  async getActivitiesByUser(userId: string, limit: number = 50): Promise<UserActivity[]> {
    return this.getActivities({ userId, limit });
  },

  /**
   * Busca atividades por tipo
   */
  async getActivitiesByType(activityType: ActivityType, limit: number = 50): Promise<UserActivity[]> {
    return this.getActivities({ activityType, limit });
  },

  /**
   * Busca estatísticas de atividades
   */
  async getActivityStats(filters?: Omit<ActivityFilters, 'limit' | 'offset'>): Promise<ActivityStats> {
    // Buscar todas as atividades (sem limite para estatísticas)
    const activities = await this.getActivities(filters);

    // Calcular estatísticas
    const byType: Record<ActivityType, number> = {
      [ActivityType.LOGIN]: 0,
      [ActivityType.LOGOUT]: 0,
      [ActivityType.PROJECT_CREATE]: 0,
      [ActivityType.PROJECT_UPDATE]: 0,
      [ActivityType.PROJECT_DELETE]: 0,
      [ActivityType.INDICATOR_CREATE]: 0,
      [ActivityType.INDICATOR_UPDATE]: 0,
      [ActivityType.INDICATOR_DELETE]: 0,
    };

    const byUserMap = new Map<string, { user_email: string; user_name: string | null; count: number }>();

    activities.forEach((activity) => {
      // Contar por tipo
      if (activity.activity_type in byType) {
        byType[activity.activity_type as ActivityType]++;
      }

      // Contar por usuário
      const existing = byUserMap.get(activity.user_email);
      if (existing) {
        existing.count++;
      } else {
        byUserMap.set(activity.user_email, {
          user_email: activity.user_email,
          user_name: activity.user_name,
          count: 1,
        });
      }
    });

    return {
      total: activities.length,
      byType,
      byUser: Array.from(byUserMap.values()).sort((a, b) => b.count - a.count),
      recentActivities: activities.slice(0, 10),
    };
  },

  /**
   * Obtém informações do navegador (IP e User Agent)
   * Nota: IP real só é disponível no backend, mas podemos tentar obter via headers
   */
  getClientInfo(): { ipAddress: string | null; userAgent: string | null } {
    return {
      ipAddress: null, // IP só disponível no backend
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    };
  },
};

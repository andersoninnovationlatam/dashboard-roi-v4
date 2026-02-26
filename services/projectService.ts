import { supabase, ProjectRow, IndicatorRow } from './supabase';
import { Project, Indicator, ProjectStatus, DevelopmentType, ImprovementType, ActivityType, EntityType } from '../types';
import { auditService } from './auditService';
import { authService } from './authService';

// Função auxiliar para obter ou criar organização padrão
const getDefaultOrganizationId = async (): Promise<string> => {
    // Primeiro, tenta buscar uma organização padrão
    const { data: existingOrgs } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);

    if (existingOrgs && existingOrgs.length > 0) {
        return existingOrgs[0].id;
    }

    // Se não existir, cria uma organização padrão
    const { data: newOrg, error } = await supabase
        .from('organizations')
        .insert({
            name: 'Organização Padrão',
        })
        .select()
        .single();

    if (error) {
        console.error('Erro ao criar organização padrão:', error);
        throw error;
    }

    return newOrg.id;
};

// Converter do banco para o tipo da aplicação
const mapProjectFromDB = (row: ProjectRow): Project => ({
    id: row.id,
    organization_id: row.organization_id,
    name: row.name,
    description: row.description || '',
    status: row.status as ProjectStatus,
    development_type: row.development_type as DevelopmentType,
    start_date: row.start_date,
    go_live_date: row.go_live_date || undefined,
    end_date: row.end_date || undefined,
    implementation_cost: Number(row.implementation_cost),
    monthly_maintenance_cost: Number(row.monthly_maintenance_cost),
    business_area: row.business_area || undefined,
    sponsor: row.sponsor || undefined,
    roi_percentage: row.roi_percentage ? Number(row.roi_percentage) : undefined,
    total_economy_annual: row.total_economy_annual ? Number(row.total_economy_annual) : undefined,
    created_at: row.created_at || undefined,
});

const mapIndicatorFromDB = (row: IndicatorRow): Indicator => ({
    id: row.id,
    project_id: row.project_id,
    name: row.name,
    description: row.description || '',
    improvement_type: row.improvement_type as ImprovementType,
    baseline: row.baseline || {},
    postIA: row.post_ia || {},
    is_active: row.is_active,
});

// PROJECTS
export const projectService = {
    // Listar todos os projetos de uma organização
    async getAll(organizationId?: string): Promise<Project[]> {
        let orgId = organizationId;

        // Se não fornecido ou não for UUID válido, busca organização padrão
        if (!orgId) {
            orgId = await getDefaultOrganizationId();
        } else {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(orgId)) {
                orgId = await getDefaultOrganizationId();
            }
        }

        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapProjectFromDB);
    },

    // Buscar projeto por ID
    async getById(id: string): Promise<Project | null> {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }
        return data ? mapProjectFromDB(data) : null;
    },

    // Criar novo projeto
    async create(project: Omit<Project, 'id'>): Promise<Project> {
        // Se organization_id não for um UUID válido, busca ou cria organização padrão
        let orgId = project.organization_id;

        // Verifica se é um UUID válido (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!orgId || !uuidRegex.test(orgId)) {
            orgId = await getDefaultOrganizationId();
        }

        const { data, error } = await supabase
            .from('projects')
            .insert({
                organization_id: orgId,
                name: project.name,
                description: project.description,
                status: project.status,
                development_type: project.development_type,
                start_date: project.start_date,
                go_live_date: project.go_live_date || null,
                end_date: project.end_date || null,
                implementation_cost: project.implementation_cost,
                monthly_maintenance_cost: project.monthly_maintenance_cost,
                business_area: project.business_area || null,
                sponsor: project.sponsor || null,
            })
            .select()
            .single();

        if (error) throw error;
        return mapProjectFromDB(data);
    },

    // Atualizar projeto
    async update(id: string, updates: Partial<Project>): Promise<Project> {
        // Construir objeto de atualização apenas com campos fornecidos
        const updateData: any = {};

        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.description !== undefined) updateData.description = updates.description === '' ? '' : updates.description;
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.development_type !== undefined) updateData.development_type = updates.development_type;
        if (updates.start_date !== undefined) updateData.start_date = updates.start_date;
        if (updates.go_live_date !== undefined) updateData.go_live_date = updates.go_live_date || null;
        if (updates.end_date !== undefined) updateData.end_date = updates.end_date || null;
        if (updates.implementation_cost !== undefined) updateData.implementation_cost = updates.implementation_cost;
        if (updates.monthly_maintenance_cost !== undefined) updateData.monthly_maintenance_cost = updates.monthly_maintenance_cost;
        if (updates.business_area !== undefined) updateData.business_area = updates.business_area || null;
        if (updates.sponsor !== undefined) updateData.sponsor = updates.sponsor === '' ? null : updates.sponsor;
        if (updates.roi_percentage !== undefined) updateData.roi_percentage = updates.roi_percentage || null;
        if (updates.total_economy_annual !== undefined) updateData.total_economy_annual = updates.total_economy_annual || null;

        const { data, error } = await supabase
            .from('projects')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        
        const project = mapProjectFromDB(data);
        
        // Registrar atividade de atualização de projeto
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          const profile = await authService.getUserProfile(currentUser.id).catch(() => null);
          const clientInfo = auditService.getClientInfo();
          
          // Identificar campos alterados
          const changedFields = Object.keys(updates).filter(key => updates[key as keyof Project] !== undefined);
          
          auditService.logActivity(
            currentUser.id,
            currentUser.email || '',
            profile?.full_name || null,
            ActivityType.PROJECT_UPDATE,
            `Atualizou o projeto "${project.name}"`,
            {
              entityType: EntityType.PROJECT,
              entityId: project.id,
              entityName: project.name,
              metadata: {
                changed_fields: changedFields,
                updates: updates,
              },
              ipAddress: clientInfo.ipAddress,
              userAgent: clientInfo.userAgent,
            }
          ).catch(() => {
            // Silently fail - audit logging should not break project update
          });
        }
        
        return project;
    },

    // Deletar projeto
    async delete(id: string): Promise<void> {
        // Buscar projeto antes de deletar para registrar no log
        const project = await this.getById(id);
        
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        // Registrar atividade de exclusão de projeto
        if (project) {
          const currentUser = await authService.getCurrentUser();
          if (currentUser) {
            const profile = await authService.getUserProfile(currentUser.id).catch(() => null);
            const clientInfo = auditService.getClientInfo();
            
            auditService.logActivity(
              currentUser.id,
              currentUser.email || '',
              profile?.full_name || null,
              ActivityType.PROJECT_DELETE,
              `Excluiu o projeto "${project.name}"`,
              {
                entityType: EntityType.PROJECT,
                entityId: project.id,
                entityName: project.name,
                ipAddress: clientInfo.ipAddress,
                userAgent: clientInfo.userAgent,
              }
            ).catch(() => {
              // Silently fail - audit logging should not break project deletion
            });
          }
        }
    },
};

// INDICATORS
export const indicatorService = {
    // Listar indicadores de um projeto
    async getByProjectId(projectId: string): Promise<Indicator[]> {
        const { data, error } = await supabase
            .from('indicators')
            .select('*')
            .eq('project_id', projectId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapIndicatorFromDB);
    },

    // Buscar indicador por ID
    async getById(id: string): Promise<Indicator | null> {
        const { data, error } = await supabase
            .from('indicators')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data ? mapIndicatorFromDB(data) : null;
    },

    // Criar novo indicador
    async create(indicator: Omit<Indicator, 'id'>): Promise<Indicator> {
        const { data, error } = await supabase
            .from('indicators')
            .insert({
                project_id: indicator.project_id,
                name: indicator.name,
                description: indicator.description,
                improvement_type: indicator.improvement_type,
                baseline: indicator.baseline,
                post_ia: indicator.postIA,
                is_active: indicator.is_active,
            })
            .select()
            .single();

        if (error) throw error;
        
        const createdIndicator = mapIndicatorFromDB(data);
        
        // Registrar atividade de criação de indicador
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          const profile = await authService.getUserProfile(currentUser.id).catch(() => null);
          const clientInfo = auditService.getClientInfo();
          
          // Buscar projeto para obter o nome
          const project = await projectService.getById(createdIndicator.project_id).catch(() => null);
          
          auditService.logActivity(
            currentUser.id,
            currentUser.email || '',
            profile?.full_name || null,
            ActivityType.INDICATOR_CREATE,
            `Criou o indicador "${createdIndicator.name}" no projeto "${project?.name || createdIndicator.project_id}"`,
            {
              entityType: EntityType.INDICATOR,
              entityId: createdIndicator.id,
              entityName: createdIndicator.name,
              metadata: {
                project_id: createdIndicator.project_id,
                project_name: project?.name,
                improvement_type: createdIndicator.improvement_type,
              },
              ipAddress: clientInfo.ipAddress,
              userAgent: clientInfo.userAgent,
            }
          ).catch(() => {
            // Silently fail - audit logging should not break indicator creation
          });
        }
        
        return createdIndicator;
    },

    // Atualizar indicador
    async update(id: string, updates: Partial<Indicator>): Promise<Indicator> {
        const { data, error } = await supabase
            .from('indicators')
            .update({
                name: updates.name,
                description: updates.description,
                improvement_type: updates.improvement_type,
                baseline: updates.baseline,
                post_ia: updates.postIA,
                is_active: updates.is_active,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        
        const indicator = mapIndicatorFromDB(data);
        
        // Registrar atividade de atualização de indicador
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          const profile = await authService.getUserProfile(currentUser.id).catch(() => null);
          const clientInfo = auditService.getClientInfo();
          
          // Buscar projeto para obter o nome
          const project = await projectService.getById(indicator.project_id).catch(() => null);
          
          // Identificar campos alterados
          const changedFields = Object.keys(updates).filter(key => updates[key as keyof Indicator] !== undefined);
          
          auditService.logActivity(
            currentUser.id,
            currentUser.email || '',
            profile?.full_name || null,
            ActivityType.INDICATOR_UPDATE,
            `Atualizou o indicador "${indicator.name}" no projeto "${project?.name || indicator.project_id}"`,
            {
              entityType: EntityType.INDICATOR,
              entityId: indicator.id,
              entityName: indicator.name,
              metadata: {
                project_id: indicator.project_id,
                project_name: project?.name,
                changed_fields: changedFields,
              },
              ipAddress: clientInfo.ipAddress,
              userAgent: clientInfo.userAgent,
            }
          ).catch(() => {
            // Silently fail - audit logging should not break indicator update
          });
        }
        
        return indicator;
    },

    // Deletar indicador (soft delete)
    async delete(id: string): Promise<void> {
        // Buscar indicador antes de deletar para registrar no log
        const indicator = await this.getById(id);
        
        const { error } = await supabase
            .from('indicators')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;
        
        // Registrar atividade de exclusão de indicador
        if (indicator) {
          const currentUser = await authService.getCurrentUser();
          if (currentUser) {
            const profile = await authService.getUserProfile(currentUser.id).catch(() => null);
            const clientInfo = auditService.getClientInfo();
            
            // Buscar projeto para obter o nome
            const project = await projectService.getById(indicator.project_id).catch(() => null);
            
            auditService.logActivity(
              currentUser.id,
              currentUser.email || '',
              profile?.full_name || null,
              ActivityType.INDICATOR_DELETE,
              `Excluiu o indicador "${indicator.name}" do projeto "${project?.name || indicator.project_id}"`,
              {
                entityType: EntityType.INDICATOR,
                entityId: indicator.id,
                entityName: indicator.name,
                metadata: {
                  project_id: indicator.project_id,
                  project_name: project?.name,
                },
                ipAddress: clientInfo.ipAddress,
                userAgent: clientInfo.userAgent,
              }
            ).catch(() => {
              // Silently fail - audit logging should not break indicator deletion
            });
          }
        }
    },
};
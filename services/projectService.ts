import { supabase, ProjectRow, IndicatorRow } from './supabase';
import { Project, Indicator, ProjectStatus, DevelopmentType, ImprovementType } from '../types';

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
        const { data, error } = await supabase
            .from('projects')
            .update({
                name: updates.name,
                description: updates.description,
                status: updates.status,
                development_type: updates.development_type,
                start_date: updates.start_date,
                go_live_date: updates.go_live_date || null,
                end_date: updates.end_date || null,
                implementation_cost: updates.implementation_cost,
                monthly_maintenance_cost: updates.monthly_maintenance_cost,
                business_area: updates.business_area || null,
                sponsor: updates.sponsor || null,
                roi_percentage: updates.roi_percentage || null,
                total_economy_annual: updates.total_economy_annual || null,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return mapProjectFromDB(data);
    },

    // Deletar projeto
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) throw error;
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
        return mapIndicatorFromDB(data);
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
        return mapIndicatorFromDB(data);
    },

    // Deletar indicador (soft delete)
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('indicators')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;
    },
};
import { supabase } from './supabase';
import { GoogleGenAI } from '@google/genai';
import { projectService, indicatorService } from './projectService';
import { calculateKPIStats, calculateIndicatorStats } from './dashboardService';
import { Indicator } from '../types';
import { DEVELOPMENT_LABELS } from '../constants';

export interface AIPrompt {
    id: string;
    organization_id: string;
    prompt_text: string;
    created_at: string;
    updated_at: string;
}

export const DEFAULT_PROMPT = "Analise os dados de ROI de projetos de IA desta organização:\n- ROI Total: {roi_total}%\n- Economia Anual: R$ {economia_anual}\n- Horas economizadas: {horas_economizadas_ano}h\n- Projetos em produção: {projetos_producao}\n- Payback médio: {payback_medio} meses\n\nForneça um insight estratégico curto (3 frases) em Português sobre o desempenho e onde focar.";

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

// Função auxiliar para obter organização do usuário atual (ou criar/obter padrão)
const getCurrentUserOrganizationId = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

    // Se o perfil tem organization_id, retorna
    if (profile?.organization_id) {
        return profile.organization_id;
    }

    // Se não tem, busca ou cria organização padrão e atualiza o perfil
    try {
        const defaultOrgId = await getDefaultOrganizationId();

        // Atualiza o perfil do usuário com a organização padrão
        const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ organization_id: defaultOrgId })
            .eq('id', user.id);

        if (updateError) {
            console.error('Erro ao atualizar perfil com organização padrão:', updateError);
            // Mesmo com erro, retorna a organização padrão para não bloquear
            return defaultOrgId;
        }

        console.log('Perfil atualizado com organização padrão:', defaultOrgId);
        return defaultOrgId;
    } catch (error) {
        console.error('Erro ao obter organização padrão:', error);
        return null;
    }
};

export const aiPromptService = {
    // Verificar se a tabela ai_prompts existe e está acessível
    async checkTableExists(): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('ai_prompts')
                .select('id')
                .limit(1);

            // Se não há erro, a tabela existe e está acessível
            if (!error) return true;

            // PGRST116 = nenhum resultado encontrado (mas a tabela existe)
            if (error.code === 'PGRST116') return true;

            // Outros erros podem indicar que a tabela não existe ou não há permissão
            // Códigos comuns: 42P01 (tabela não existe), 42501 (permissão negada)
            console.warn('Possível problema com a tabela ai_prompts:', {
                code: error.code,
                message: error.message
            });
            return false;
        } catch (err) {
            console.error('Erro ao verificar tabela ai_prompts:', err);
            return false;
        }
    },

    // Buscar prompt da organização atual (sempre do banco)
    async getPrompt(): Promise<string> {
        try {
            const orgId = await getCurrentUserOrganizationId();
            if (!orgId) {
                console.warn('Organização não encontrada, usando prompt padrão');
                return DEFAULT_PROMPT;
            }

            // Sempre tenta buscar do banco primeiro
            const { data, error } = await supabase
                .from('ai_prompts')
                .select('prompt_text')
                .eq('organization_id', orgId)
                .single();

            // Se não encontrou (PGRST116 = não existe registro), retorna o padrão
            if (error) {
                if (error.code === 'PGRST116') {
                    // Não existe prompt salvo ainda para esta organização
                    console.log('Nenhum prompt customizado encontrado no banco, usando padrão');
                    return DEFAULT_PROMPT;
                }
                // Outro erro (permissão, tabela não existe, etc)
                console.error('Erro ao buscar prompt do banco:', {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint
                });
                return DEFAULT_PROMPT;
            }

            // Verifica se os dados são válidos
            if (!data || !data.prompt_text || data.prompt_text.trim() === '') {
                console.warn('Prompt encontrado mas está vazio, usando padrão');
                return DEFAULT_PROMPT;
            }

            // Retorna o prompt do banco
            console.log('Prompt carregado do banco de dados com sucesso');
            return data.prompt_text;
        } catch (err) {
            console.error('Erro inesperado ao buscar prompt:', err);
            return DEFAULT_PROMPT;
        }
    },

    // Salvar ou atualizar prompt da organização atual
    async savePrompt(promptText: string): Promise<void> {
        const orgId = await getCurrentUserOrganizationId();
        if (!orgId) {
            throw new Error('Não foi possível obter ou criar uma organização. Verifique sua conexão e permissões no Supabase.');
        }

        // Verifica o perfil do usuário para debug
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role, organization_id')
            .eq('id', user.id)
            .single();

        if (!profile) {
            throw new Error('Perfil de usuário não encontrado');
        }

        // Verifica se o usuário é admin (apenas admins podem editar)
        if (profile.role !== 'admin') {
            throw new Error(`Você não tem permissão para salvar prompts. Seu role atual é: ${profile.role}. Apenas admins podem editar prompts.`);
        }

        // Verifica se a tabela existe primeiro
        const tableExists = await this.checkTableExists();
        if (!tableExists) {
            throw new Error('A tabela ai_prompts não existe ou não está acessível. Execute a migration create_ai_prompts_table.sql no Supabase.');
        }

        // Verifica se já existe um prompt para esta organização
        const { data: existing, error: checkError } = await supabase
            .from('ai_prompts')
            .select('id')
            .eq('organization_id', orgId)
            .maybeSingle(); // Usa maybeSingle ao invés de single para não dar erro se não existir

        if (checkError && checkError.code !== 'PGRST116') {
            // Erro diferente de "não encontrado", lança o erro com mais detalhes
            console.error('Erro ao verificar prompt existente:', {
                code: checkError.code,
                message: checkError.message,
                details: checkError.details,
                hint: checkError.hint
            });
            throw new Error(`Erro ao verificar prompt: ${checkError.message || checkError.code}. Detalhes: ${checkError.details || 'N/A'}`);
        }

        if (existing && existing.id) {
            // Atualiza o prompt existente
            console.log('Atualizando prompt existente no banco...');
            const { data: updated, error } = await supabase
                .from('ai_prompts')
                .update({ prompt_text: promptText })
                .eq('organization_id', orgId)
                .select()
                .single();

            if (error) {
                console.error('Erro ao atualizar prompt:', {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint
                });
                throw new Error(`Erro ao atualizar prompt: ${error.message || error.code}. Verifique se você tem permissão (admin) e se as políticas RLS estão configuradas corretamente.`);
            }
            console.log('Prompt atualizado com sucesso no banco');
        } else {
            // Cria um novo prompt
            console.log('Criando novo prompt no banco...');
            const { data: inserted, error } = await supabase
                .from('ai_prompts')
                .insert({
                    organization_id: orgId,
                    prompt_text: promptText,
                })
                .select()
                .single();

            if (error) {
                console.error('Erro ao inserir prompt:', {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint
                });
                throw new Error(`Erro ao salvar prompt: ${error.message || error.code}. Verifique se você tem permissão (admin) e se as políticas RLS estão configuradas corretamente. Detalhes: ${error.details || 'N/A'}`);
            }
            console.log('Prompt criado com sucesso no banco:', inserted?.id);
        }
    },

    // Obter prompt completo (com todos os dados)
    async getPromptFull(): Promise<AIPrompt | null> {
        const orgId = await getCurrentUserOrganizationId();
        if (!orgId) return null;

        const { data, error } = await supabase
            .from('ai_prompts')
            .select('*')
            .eq('organization_id', orgId)
            .single();

        if (error || !data) {
            return null;
        }

        return data as AIPrompt;
    },

    // Gerar insight usando dados dos indicadores salvos no banco e prompt configurado
    async generateInsight(): Promise<string> {
        try {
            // 1. Obter organização atual
            const orgId = await getCurrentUserOrganizationId();
            if (!orgId) {
                throw new Error('Não foi possível obter a organização do usuário');
            }

            // 2. Buscar todos os projetos da organização
            const projects = await projectService.getAll(orgId);

            // 3. Buscar todos os indicadores dos projetos
            const allIndicators: Indicator[] = [];
            for (const project of projects) {
                try {
                    const indicators = await indicatorService.getByProjectId(project.id);
                    allIndicators.push(...indicators);
                } catch (error) {
                    console.error(`Erro ao buscar indicadores do projeto ${project.id}:`, error);
                }
            }

            // 4. Calcular estatísticas usando os dados dos indicadores
            const stats = calculateKPIStats(projects, allIndicators);

            // 5. Buscar o prompt configurado pelo admin
            const promptTemplate = await this.getPrompt();

            // 6. Substituir variáveis do prompt com dados reais dos indicadores
            const finalPrompt = promptTemplate
                .replace('{roi_total}', stats.roi_total.toString())
                .replace('{economia_anual}', stats.economia_anual.toLocaleString('pt-BR'))
                .replace('{horas_economizadas_ano}', stats.horas_economizadas_ano.toLocaleString('pt-BR'))
                .replace('{projetos_producao}', stats.projetos_producao.toString())
                .replace('{payback_medio}', stats.payback_medio.toString())
                // Variáveis adicionais que podem estar no prompt
                .replace('{projetos_concluidos}', stats.projetos_concluidos.toString())
                .replace('{horas_baseline_ano}', stats.horas_baseline_ano?.toLocaleString('pt-BR') || '0')
                .replace('{horas_posia_ano}', stats.horas_posia_ano?.toLocaleString('pt-BR') || '0')
                .replace('{custo_mo_baseline}', stats.custo_mo_baseline?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0')
                .replace('{custo_mo_posia}', stats.custo_mo_posia?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0')
                .replace('{economia_mo}', stats.economia_mo?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0')
                .replace('{custo_ia_anual}', stats.custo_ia_anual?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0')
                .replace('{economia_liquida}', stats.economia_liquida?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0')
                .replace('{roi_calculado}', stats.roi_calculado?.toString() || '0')
                .replace('{payback_calculado}', stats.payback_calculado?.toString() || '0');

            // 7. Verificar se a API key está configurada
            const apiKey = process.env.API_KEY;
            if (!apiKey) {
                throw new Error('API_KEY não configurada. Configure a variável de ambiente API_KEY com a chave do Gemini.');
            }

            // 8. Chamar a API do Gemini para gerar o insight
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: finalPrompt,
            });

            // 9. Retornar o insight gerado
            const insight = response.text || 'Insight não disponível no momento.';
            console.log('Insight gerado com sucesso usando dados dos indicadores do banco');
            return insight;
        } catch (err) {
            console.error('Erro ao gerar insight:', err);
            if (err instanceof Error) {
                throw new Error(`Erro ao gerar insight: ${err.message}`);
            }
            throw new Error('Erro desconhecido ao gerar insight');
        }
    },

    // Gerar insight para um projeto específico usando dados dos indicadores salvos no banco
    async generateProjectInsight(projectId: string): Promise<string> {
        try {
            // 1. Buscar o projeto específico do banco
            const project = await projectService.getById(projectId);
            if (!project) {
                throw new Error('Projeto não encontrado');
            }

            // 2. Buscar todos os indicadores do projeto do banco
            const projectIndicators = await indicatorService.getByProjectId(projectId);

            // 3. Calcular estatísticas apenas deste projeto
            const stats = calculateKPIStats([project], projectIndicators);

            // Calcular economia anual específica do projeto
            const annualEconomy = projectIndicators
                .filter(ind => ind.is_active)
                .reduce((acc, ind) => {
                    const indicatorStats = calculateIndicatorStats(ind);
                    return acc + indicatorStats.annualEconomy;
                }, 0);

            // 4. Buscar o prompt configurado pelo admin
            const promptTemplate = await this.getPrompt();

            // 5. Verificar se o prompt é genérico (dashboard) ou customizado
            const isGenericPrompt = promptTemplate.includes('{roi_total}') ||
                promptTemplate.includes('{economia_anual}') ||
                promptTemplate.includes('{projetos_producao}');

            let finalPrompt: string;

            if (isGenericPrompt) {
                // Se for prompt genérico do dashboard, usar prompt específico de projeto
                finalPrompt = `Analise o projeto de IA específico:
- Nome: {nome_projeto}
- Tipo: {tipo_projeto}
- Status: {status_projeto}
- Economia Anual: R$ {economia_anual_projeto}
- ROI do Projeto: {roi_projeto}%
- Sponsor: {sponsor_projeto}
- Indicadores ativos: {indicadores_ativos}
- Horas economizadas: {horas_economizadas_projeto}h

Gere um insight executivo curto e direto em Português sobre o valor deste projeto específico para o negócio.`;
            } else {
                // Se for prompt customizado, adaptar para o contexto do projeto
                finalPrompt = promptTemplate + `\n\nContexto do projeto específico:
- Nome: {nome_projeto}
- Tipo: {tipo_projeto}
- Status: {status_projeto}
- Economia Anual: R$ {economia_anual_projeto}
- ROI do Projeto: {roi_projeto}%
- Sponsor: {sponsor_projeto}
- Indicadores ativos: {indicadores_ativos}
- Horas economizadas: {horas_economizadas_projeto}h`;
            }

            // 6. Substituir variáveis específicas do projeto
            const horasEconomizadas = stats.horas_economizadas_ano; // Já calculado apenas para este projeto
            const indicadoresAtivos = projectIndicators.filter(ind => ind.is_active).length;

            finalPrompt = finalPrompt
                .replace('{nome_projeto}', project.name || 'Não informado')
                .replace('{tipo_projeto}', DEVELOPMENT_LABELS[project.development_type] || 'Não informado')
                .replace('{status_projeto}', project.status || 'Não informado')
                .replace('{economia_anual_projeto}', annualEconomy.toLocaleString('pt-BR'))
                .replace('{roi_projeto}', (project.roi_percentage || stats.roi_total || 0).toString())
                .replace('{sponsor_projeto}', project.sponsor || 'Não informado')
                .replace('{indicadores_ativos}', indicadoresAtivos.toString())
                .replace('{horas_economizadas_projeto}', horasEconomizadas.toLocaleString('pt-BR'))
                // Também substituir variáveis do dashboard caso o admin tenha customizado o prompt
                .replace('{roi_total}', (project.roi_percentage || stats.roi_total || 0).toString())
                .replace('{economia_anual}', annualEconomy.toLocaleString('pt-BR'))
                .replace('{horas_economizadas_ano}', horasEconomizadas.toLocaleString('pt-BR'))
                .replace('{projetos_producao}', '1') // Apenas este projeto
                .replace('{payback_medio}', stats.payback_medio.toString());

            // 7. Verificar se a API key está configurada
            const apiKey = process.env.API_KEY;
            if (!apiKey) {
                throw new Error('API_KEY não configurada. Configure a variável de ambiente API_KEY com a chave do Gemini.');
            }

            // 8. Chamar a API do Gemini para gerar o insight
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: finalPrompt,
            });

            // 9. Retornar o insight gerado
            const insight = response.text || 'Insight não disponível no momento.';
            console.log('Insight de projeto gerado com sucesso usando dados dos indicadores do banco');
            return insight;
        } catch (err) {
            console.error('Erro ao gerar insight de projeto:', err);
            if (err instanceof Error) {
                throw new Error(`Erro ao gerar insight de projeto: ${err.message}`);
            }
            throw new Error('Erro desconhecido ao gerar insight de projeto');
        }
    },
};

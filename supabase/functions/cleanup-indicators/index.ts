// ============================================
// EDGE FUNCTION: Limpeza Automática de Indicadores
// ============================================
// Esta função deve ser agendada para executar diariamente
// Configuração: Supabase Dashboard > Edge Functions > Cron Jobs
// ============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const RETENTION_DAYS = 90; // Período de retenção em dias (configurável via env)

Deno.serve(async (req: Request) => {
    try {
        // Obter variáveis de ambiente
        const supabaseUrl = Deno.env.get('DATABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!;

        // Criar cliente com service role key para bypass RLS
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Calcular data limite (90 dias atrás)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

        // Buscar indicadores inativos há mais de 90 dias
        const { data: indicatorsToDelete, error: fetchError } = await supabase
            .from('indicators')
            .select('id, name, project_id, updated_at')
            .eq('is_active', false)
            .lt('updated_at', cutoffDate.toISOString());

        if (fetchError) {
            console.error('Erro ao buscar indicadores:', fetchError);
            throw fetchError;
        }

        if (!indicatorsToDelete || indicatorsToDelete.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Nenhum indicador encontrado para limpeza',
                    deleted_count: 0,
                    deleted_ids: []
                }),
                {
                    headers: { 'Content-Type': 'application/json' },
                    status: 200
                }
            );
        }

        // Extrair IDs para deletar
        const idsToDelete = indicatorsToDelete.map(ind => ind.id);

        // Deletar indicadores
        const { error: deleteError } = await supabase
            .from('indicators')
            .delete()
            .in('id', idsToDelete);

        if (deleteError) {
            console.error('Erro ao deletar indicadores:', deleteError);
            throw deleteError;
        }

        // Registrar no log (se a tabela existir)
        try {
            await supabase
                .from('indicators_cleanup_log')
                .insert({
                    deleted_count: idsToDelete.length,
                    deleted_ids: idsToDelete,
                    retention_days: RETENTION_DAYS,
                    execution_time_ms: null // Pode ser calculado se necessário
                });
        } catch (logError) {
            // Log não crítico, apenas avisar
            console.warn('Erro ao registrar log (não crítico):', logError);
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `Limpeza concluída com sucesso`,
                deleted_count: idsToDelete.length,
                deleted_ids: idsToDelete,
                retention_days: RETENTION_DAYS,
                cutoff_date: cutoffDate.toISOString()
            }),
            {
                headers: { 'Content-Type': 'application/json' },
                status: 200
            }
        );

    } catch (error: any) {
        console.error('Erro na função de limpeza:', error);

        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || 'Erro desconhecido',
                details: error.toString()
            }),
            {
                headers: { 'Content-Type': 'application/json' },
                status: 500
            }
        );
    }
});

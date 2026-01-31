import { createClient } from '@supabase/supabase-js';
import { Project, Indicator } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para o banco (compatíveis com types.ts)
export interface ProjectRow {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    status: string;
    development_type: string;
    start_date: string;
    go_live_date: string | null;
    end_date: string | null;
    implementation_cost: number;
    monthly_maintenance_cost: number;
    business_area: string | null;
    sponsor: string | null;
    roi_percentage: number | null;
    total_economy_annual: number | null;
    created_at: string;
    updated_at: string;
}

export interface IndicatorRow {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    improvement_type: string;
    baseline: any; // JSONB
    post_ia: any; // JSONB
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
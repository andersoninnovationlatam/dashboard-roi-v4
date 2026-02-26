
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  ANALYST = 'analyst',
  VIEWER = 'viewer'
}

export enum ProjectStatus {
  PLANNING = 'planning',
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  PRODUCTION = 'production',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum DevelopmentType {
  CHATBOT = 'chatbot',
  COPILOT = 'copilot',
  AUTOMATION_N8N = 'automation_n8n',
  AUTOMATION_RPA = 'automation_rpa',
  INTEGRATION = 'integration',
  DASHBOARD = 'dashboard',
  ML_MODEL = 'ml_model',
  NLP_ANALYSIS = 'nlp_analysis',
  DOCUMENT_PROCESSING = 'document_processing',
  OTHER = 'other'
}

export enum ImprovementType {
  PRODUCTIVITY = 'productivity',
  REVENUE_INCREASE = 'revenue_increase',
  MARGIN_IMPROVEMENT = 'margin_improvement',
  ANALYTICAL_CAPACITY = 'analytical_capacity',
  RISK_REDUCTION = 'risk_reduction',
  DECISION_QUALITY = 'decision_quality',
  SPEED = 'speed',
  SATISFACTION = 'satisfaction',
  RELATED_COSTS = 'related_costs',
  CUSTOM = 'custom',
  OTHER = 'other'
}

export enum FrequencyUnit {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

// Enum para métricas customizadas
export enum CustomMetricUnit {
  HOUR = 'hour',
  DAY = 'day',
  MONTH = 'month',
  YEAR = 'year',
  CURRENCY = 'currency', // R$
  PERCENTAGE = 'percentage' // %
}

// Configuração para indicador personalizado
export interface CustomConfig {
  direction: 'increase' | 'decrease';
  unitType: 'percentage' | 'currency' | 'time' | 'quantity' | 'custom';
  unitLabel?: string;
  timeUnit?: FrequencyUnit; // Unidade de tempo (hora, dia, semana, mês, ano) quando unitType = 'time'
  hasFinancialImpact: boolean;
  unitCost?: number; // Custo por unidade (quando hasFinancialImpact = true)
  volume?: number; // Volume para cálculo de impacto financeiro
}

export interface PersonInvolved {
  id: string;
  name: string;
  role: string;
  hourlyRate: number;
  minutesSpent: number;
  frequencyQuantity: number;
  frequencyUnit: FrequencyUnit;
}

export interface ToolCost {
  id: string;
  name: string;
  monthlyCost: number;
  otherCosts?: number;
}

export interface IndicatorData {
  people?: PersonInvolved[];
  tools?: ToolCost[];
  value?: number;
  revenue?: number;
  cost?: number;
  marginPct?: number;
  volume?: number;
  probability?: number;
  impact?: number;
  mitigationCost?: number;
  decisionCount?: number;
  accuracyPct?: number;
  errorCost?: number;
  decisionTime?: number;
  deliveryTime?: number;
  deliveryCount?: number;
  delayCost?: number;
  score?: number; // NPS/CSAT
  clientCount?: number;
  valuePerClient?: number;
  churnRate?: number;
  implementationCost?: number;
  // Campos para indicador personalizado
  customValue?: number;
  customMetricUnit?: CustomMetricUnit;
  customFrequencyUnit?: FrequencyUnit; // Usado quando customMetricUnit é CURRENCY
  customConfig?: CustomConfig; // Nova configuração flexível para CUSTOM
}

export interface Indicator {
  id: string;
  project_id: string;
  name: string;
  description: string;
  improvement_type: ImprovementType;
  baseline: IndicatorData;
  postIA: IndicatorData;
  is_active: boolean;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  development_type: DevelopmentType;
  start_date: string;
  go_live_date?: string;
  end_date?: string;
  implementation_cost: number;
  monthly_maintenance_cost: number;
  business_area?: string;
  sponsor?: string;
  roi_percentage?: number;
  total_economy_annual?: number;
  created_at?: string;
}

export interface KPIStats {
  roi_total: number;
  economia_anual: number;
  horas_economizadas_ano: number;
  projetos_producao: number;
  projetos_concluidos: number;
  payback_medio: number;
  horas_baseline_ano: number;
  horas_posia_ano: number;
  custo_mo_baseline: number;
  custo_mo_posia: number;
  economia_mo: number;
  custo_ia_anual: number;
  economia_liquida: number;
  roi_calculado: number;
  payback_calculado: number;
}

// Audit System Types
export enum ActivityType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PROJECT_CREATE = 'PROJECT_CREATE',
  PROJECT_UPDATE = 'PROJECT_UPDATE',
  PROJECT_DELETE = 'PROJECT_DELETE',
  INDICATOR_CREATE = 'INDICATOR_CREATE',
  INDICATOR_UPDATE = 'INDICATOR_UPDATE',
  INDICATOR_DELETE = 'INDICATOR_DELETE',
}

export enum EntityType {
  PROJECT = 'Projeto',
  INDICATOR = 'Indicador',
  USER = 'Usuário',
  SYSTEM = 'Sistema',
}

export interface UserActivity {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  activity_type: ActivityType;
  activity_description: string;
  entity_type: EntityType | null;
  entity_id: string | null;
  entity_name: string | null;
  metadata: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Lista de emails autorizados para visualizar logs de auditoria
// IMPORTANTE: Atualizar estes emails com os emails reais dos usuários autorizados
export const AUDIT_AUTHORIZED_EMAILS = [
  'anderson.pinto@innovationlatam.com', // Substituir pelo email real do primeiro usuário autorizado
  'jpb@innovationlatam.com', // Substituir pelo email real do segundo usuário autorizado
];

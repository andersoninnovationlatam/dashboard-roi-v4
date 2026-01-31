
import { Project, ProjectStatus, DevelopmentType, KPIStats, ImprovementType, Indicator, FrequencyUnit } from '../types';

export const mockStats: KPIStats = {
  roi_total: 245.5,
  economia_anual: 1250000,
  horas_economizadas_ano: 15680,
  projetos_producao: 8,
  projetos_concluidos: 3,
  payback_medio: 4.2
};

export const mockIndicators: Record<string, Indicator[]> = {
  '1': [
    {
      id: 'ind1',
      project_id: '1',
      name: 'Tempo de Análise por Feedback',
      description: 'Minutos gastos por um humano para classificar um feedback.',
      improvement_type: ImprovementType.SPEED,
      // Fix: Align with Indicator interface from types.ts
      baseline: {
        people: [{
          id: 'p1',
          name: 'Analista CX',
          role: 'Triagem',
          hourlyRate: 40,
          minutesSpent: 15,
          frequencyQuantity: 5000,
          frequencyUnit: FrequencyUnit.MONTH
        }]
      },
      postIA: {
        people: [{
          id: 'p1',
          name: 'Analista CX',
          role: 'Triagem',
          hourlyRate: 40,
          minutesSpent: 2,
          frequencyQuantity: 5000,
          frequencyUnit: FrequencyUnit.MONTH
        }]
      },
      is_active: true
    },
    {
      id: 'ind2',
      project_id: '1',
      name: 'Taxa de Erro na Classificação',
      description: 'Porcentagem de feedbacks classificados incorretamente.',
      // Fix: Use DECISION_QUALITY as QUALITY doesn't exist in ImprovementType
      improvement_type: ImprovementType.DECISION_QUALITY,
      baseline: {
        value: 12
      },
      postIA: {
        value: 4
      },
      is_active: true
    }
  ],
  '3': [
    {
      id: 'ind3',
      project_id: '3',
      name: 'Horas em Conciliação',
      description: 'Horas mensais do time financeiro.',
      improvement_type: ImprovementType.PRODUCTIVITY,
      // Fix: Align with Indicator interface from types.ts
      baseline: {
        people: [{
          id: 'p2',
          name: 'Time Financeiro',
          role: 'Conciliação',
          hourlyRate: 60,
          minutesSpent: 60,
          frequencyQuantity: 160,
          frequencyUnit: FrequencyUnit.MONTH
        }]
      },
      postIA: {
        people: [{
          id: 'p2',
          name: 'Time Financeiro',
          role: 'Conciliação',
          hourlyRate: 60,
          minutesSpent: 4.5, // 12h / 160 tasks = 0.075h = 4.5m
          frequencyQuantity: 160,
          frequencyUnit: FrequencyUnit.MONTH
        }]
      },
      is_active: true
    }
  ]
};

export const mockProjects: Project[] = [
  {
    id: '1',
    organization_id: 'org1',
    name: 'Análise de Sentimento NPS',
    description: 'Automatização do processamento de feedbacks de clientes usando LLMs.',
    status: ProjectStatus.PRODUCTION,
    development_type: DevelopmentType.NLP_ANALYSIS,
    start_date: '2024-01-15',
    go_live_date: '2024-03-01',
    implementation_cost: 45000,
    monthly_maintenance_cost: 1200,
    business_area: 'CX',
    sponsor: 'Maria Silva',
    roi_percentage: 380.5,
    total_economy_annual: 456000
  },
  {
    id: '2',
    organization_id: 'org1',
    name: 'Assistente Jurídico V1',
    description: 'Chatbot para triagem de contratos e dúvidas de RH.',
    status: ProjectStatus.DEVELOPMENT,
    development_type: DevelopmentType.CHATBOT,
    start_date: '2024-06-01',
    implementation_cost: 85000,
    monthly_maintenance_cost: 2500,
    business_area: 'Legal',
    sponsor: 'Ricardo Lima',
    roi_percentage: 120.0,
    total_economy_annual: 150000
  },
  {
    id: '3',
    organization_id: 'org1',
    name: 'Automação Financeira n8n',
    description: 'Conciliação bancária automática com OCR e IA Generativa.',
    status: ProjectStatus.PRODUCTION,
    development_type: DevelopmentType.AUTOMATION_N8N,
    start_date: '2023-10-01',
    go_live_date: '2023-12-15',
    implementation_cost: 32000,
    monthly_maintenance_cost: 500,
    business_area: 'Financeiro',
    sponsor: 'Ana Paula',
    roi_percentage: 540.2,
    total_economy_annual: 280000
  }
];

export const economyHistoryData = [
  { month: 'Jan', bruta: 85000, investimento: 15000, liquida: 70000 },
  { month: 'Fev', bruta: 92000, investimento: 12000, liquida: 80000 },
  { month: 'Mar', bruta: 105000, investimento: 12000, liquida: 93000 },
  { month: 'Abr', bruta: 110000, investimento: 12000, liquida: 98000 },
  { month: 'Mai', bruta: 115000, investimento: 12000, liquida: 103000 },
  { month: 'Jun', bruta: 128000, investimento: 14000, liquida: 114000 },
];

export const distributionByTypeData = [
  { type: 'Produtividade', value: 650000, color: '#4CAF50' },
  { type: 'Redução de Custo', value: 350000, color: '#FF9800' },
  { type: 'Capacidade Analítica', value: 250000, color: '#2196F3' },
];

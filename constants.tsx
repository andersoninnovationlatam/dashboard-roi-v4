
import React from 'react';

export const COLORS = {
  productivity: '#4CAF50',
  revenue_increase: '#9C27B0',
  margin_improvement: '#2196F3',
  analytical_capacity: '#00BCD4',
  risk_reduction: '#F44336',
  decision_quality: '#673AB7',
  speed: '#FF9800',
  satisfaction: '#E91E63',
  related_costs: '#795548',
  other: '#607D8B',
};

export const IMPROVEMENT_LABELS: Record<string, string> = {
  productivity: 'Produtividade',
  revenue_increase: 'Incremento Receita',
  margin_improvement: 'Melhoria Margem',
  analytical_capacity: 'Capacidade Analítica',
  risk_reduction: 'Redução de Risco',
  decision_quality: 'Qualidade Decisão',
  speed: 'Velocidade',
  satisfaction: 'Satisfação',
  related_costs: 'Custos Relacionados',
  other: 'Outros'
};

export const DEVELOPMENT_LABELS: Record<string, string> = {
  chatbot: 'Chatbot / Assistente',
  copilot: 'Copiloto de IA',
  automation_n8n: 'Automação n8n',
  automation_rpa: 'RPA Tradicional',
  integration: 'Integração',
  dashboard: 'Dashboard Analítico',
  ml_model: 'Modelo ML',
  nlp_analysis: 'NLP',
  document_processing: 'Processamento Docs',
  other: 'Outros'
};

export const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-700',
  development: 'bg-blue-100 text-blue-700',
  testing: 'bg-yellow-100 text-yellow-700',
  production: 'bg-green-100 text-green-700',
  on_hold: 'bg-orange-100 text-orange-700',
  completed: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-red-100 text-red-700'
};

import { Project, Indicator, KPIStats, ImprovementType, ProjectStatus, PersonInvolved, ToolCost, IndicatorData, FrequencyUnit } from '../types';
import { projectService } from './projectService';
import { indicatorService } from './projectService';

// Interface para histórico mensal
export interface EconomyHistoryItem {
  month: string;
  bruta: number;
  investimento: number;
  liquida: number;
}

// Interface para distribuição por tipo
export interface DistributionItem {
  type: string;
  value: number;
  color: string;
}

// Mapeamento de tipos de melhoria para labels e cores
const IMPROVEMENT_TYPE_LABELS: Record<ImprovementType, { label: string; color: string }> = {
  [ImprovementType.PRODUCTIVITY]: { label: 'Produtividade', color: '#4CAF50' },
  [ImprovementType.REVENUE_INCREASE]: { label: 'Aumento de Receita', color: '#2196F3' },
  [ImprovementType.MARGIN_IMPROVEMENT]: { label: 'Melhoria de Margem', color: '#9C27B0' },
  [ImprovementType.ANALYTICAL_CAPACITY]: { label: 'Capacidade Analítica', color: '#FF9800' },
  [ImprovementType.RISK_REDUCTION]: { label: 'Redução de Risco', color: '#F44336' },
  [ImprovementType.DECISION_QUALITY]: { label: 'Qualidade de Decisão', color: '#00BCD4' },
  [ImprovementType.SPEED]: { label: 'Velocidade', color: '#4CAF50' },
  [ImprovementType.SATISFACTION]: { label: 'Satisfação', color: '#FFC107' },
  [ImprovementType.RELATED_COSTS]: { label: 'Custos Relacionados', color: '#795548' },
  [ImprovementType.OTHER]: { label: 'Outros', color: '#9E9E9E' },
};

// Função utilitária para calcular estatísticas de um indicador
export const calculateIndicatorStats = (ind: Indicator) => {
  let monthlyEconomy = 0;
  let baselineCost = 0;
  let postIACost = 0;
  let improvementPct = "0";

  const calcPeopleCost = (people?: PersonInvolved[]) =>
    (people || []).reduce((acc, p) => {
      // Converter frequência para mensal
      let monthlyFrequency = p.frequencyQuantity;
      switch (p.frequencyUnit) {
        case FrequencyUnit.HOUR:
          monthlyFrequency = p.frequencyQuantity * 24 * 30; // Aproximação
          break;
        case FrequencyUnit.DAY:
          monthlyFrequency = p.frequencyQuantity * 30;
          break;
        case FrequencyUnit.WEEK:
          monthlyFrequency = p.frequencyQuantity * 4.33;
          break;
        case FrequencyUnit.QUARTER:
          monthlyFrequency = p.frequencyQuantity / 3;
          break;
        case FrequencyUnit.YEAR:
          monthlyFrequency = p.frequencyQuantity / 12;
          break;
        case FrequencyUnit.MONTH:
        default:
          monthlyFrequency = p.frequencyQuantity;
      }
      return acc + (p.hourlyRate * (p.minutesSpent / 60) * monthlyFrequency);
    }, 0);

  const calcToolsCost = (tools?: ToolCost[]) =>
    (tools || []).reduce((acc, t) => acc + (t.monthlyCost + (t.otherCosts || 0)), 0);

  switch (ind.improvement_type) {
    case ImprovementType.PRODUCTIVITY:
    case ImprovementType.SPEED:
    case ImprovementType.DECISION_QUALITY:
      baselineCost = calcPeopleCost(ind.baseline.people) + calcToolsCost(ind.baseline.tools) + (ind.baseline.cost || 0);
      postIACost = calcPeopleCost(ind.postIA.people) + calcToolsCost(ind.postIA.tools) + (ind.postIA.cost || 0);

      if (ind.improvement_type === ImprovementType.DECISION_QUALITY) {
        baselineCost += (ind.baseline.decisionCount || 0) * (1 - (ind.baseline.accuracyPct || 0) / 100) * (ind.baseline.errorCost || 0);
        postIACost += (ind.postIA.decisionCount || 0) * (1 - (ind.postIA.accuracyPct || 0) / 100) * (ind.postIA.errorCost || 0);
      }

      monthlyEconomy = baselineCost - postIACost;
      improvementPct = baselineCost > 0 ? ((baselineCost - postIACost) / baselineCost * 100).toFixed(1) : "0";
      break;

    case ImprovementType.REVENUE_INCREASE:
      monthlyEconomy = (ind.postIA.revenue || 0) - (ind.baseline.revenue || 0);
      improvementPct = ind.baseline.revenue ? (((ind.postIA.revenue || 0) / (ind.baseline.revenue || 1) - 1) * 100).toFixed(1) : "100";
      break;

    case ImprovementType.MARGIN_IMPROVEMENT:
      const marginBaseline = (ind.baseline.revenue || 0) - (ind.baseline.cost || 0);
      const marginPost = (ind.postIA.revenue || 0) - (ind.postIA.cost || 0);
      monthlyEconomy = marginPost - marginBaseline;
      improvementPct = marginBaseline !== 0 ? ((marginPost - marginBaseline) / Math.abs(marginBaseline) * 100).toFixed(1) : "100";
      break;

    case ImprovementType.RISK_REDUCTION:
      const riskBefore = (ind.baseline.probability || 0) / 100 * (ind.baseline.impact || 0);
      const riskAfter = (ind.postIA.probability || 0) / 100 * (ind.postIA.impact || 0);
      monthlyEconomy = (riskBefore - riskAfter) + ((ind.baseline.mitigationCost || 0) - (ind.postIA.mitigationCost || 0));
      improvementPct = riskBefore > 0 ? (((riskBefore - riskAfter) / riskBefore) * 100).toFixed(1) : "0";
      break;

    case ImprovementType.SATISFACTION:
      const churnBeforeVal = (ind.baseline.churnRate || 0) / 100 * (ind.baseline.clientCount || 0) * (ind.baseline.valuePerClient || 0);
      const churnAfterVal = (ind.postIA.churnRate || 0) / 100 * (ind.postIA.clientCount || 0) * (ind.postIA.valuePerClient || 0);
      monthlyEconomy = (churnBeforeVal - churnAfterVal) + ((ind.postIA.revenue || 0) - (ind.baseline.revenue || 0));
      improvementPct = (ind.postIA.score && ind.baseline.score) ? (((ind.postIA.score - ind.baseline.score) / ind.baseline.score) * 100).toFixed(1) : "0";
      break;

    case ImprovementType.RELATED_COSTS:
      // Calcular custo anual baseado em tools com frequência
      const relatedCostsAnnual = (ind.baseline.tools || []).reduce((acc, tool) => {
        const freqQty = (tool as any).frequencyQuantity || 1;
        const freqUnit = (tool as any).frequencyUnit || FrequencyUnit.MONTH;
        const multiplier = getFrequencyMultiplierAnnual(freqUnit);
        return acc + (tool.monthlyCost * freqQty * multiplier);
      }, 0);
      monthlyEconomy = relatedCostsAnnual / 12; // Converter anual para mensal
      improvementPct = relatedCostsAnnual > 0 ? "100" : "0";
      break;

    default:
      monthlyEconomy = (ind.postIA.value || 0) - (ind.baseline.value || 0);
      improvementPct = ind.baseline.value ? (((ind.postIA.value || 0) / (ind.baseline.value || 1) - 1) * 100).toFixed(1) : "0";
  }

  return {
    monthlyEconomy,
    annualEconomy: monthlyEconomy * 12,
    improvementPct
  };
};

// Função auxiliar para converter frequência para mensal
const getFrequencyMultiplier = (unit: FrequencyUnit): number => {
  switch (unit) {
    case FrequencyUnit.HOUR:
      return 24 * 30; // Aproximação
    case FrequencyUnit.DAY:
      return 30;
    case FrequencyUnit.WEEK:
      return 4.33;
    case FrequencyUnit.QUARTER:
      return 1 / 3;
    case FrequencyUnit.YEAR:
      return 1 / 12;
    case FrequencyUnit.MONTH:
    default:
      return 1;
  }
};

// Função auxiliar para obter multiplicador de frequência (lê do localStorage se disponível)
const getFrequencyMultiplierAnnual = (unit: FrequencyUnit): number => {
  try {
    const stored = localStorage.getItem('frequencyMultipliers');
    if (stored) {
      const multipliers = JSON.parse(stored);
      if (multipliers[unit] !== undefined) {
        return multipliers[unit];
      }
    }
  } catch (e) {
    // Se houver erro ao ler localStorage, usar valores padrão
  }

  // Valores padrão
  switch (unit) {
    case FrequencyUnit.HOUR:
      return 2080;
    case FrequencyUnit.DAY:
      return 260;
    case FrequencyUnit.WEEK:
      return 52;
    case FrequencyUnit.MONTH:
      return 12;
    case FrequencyUnit.QUARTER:
      return 4;
    case FrequencyUnit.YEAR:
      return 1;
    default:
      return 1;
  }
};

// Calcular frequência anual (não exibido, apenas para cálculos)
const calculateAnnualFrequency = (frequencyQuantity: number, frequencyUnit: FrequencyUnit): number => {
  return frequencyQuantity * getFrequencyMultiplierAnnual(frequencyUnit);
};

// Calcular horas baseline anuais
const calculateBaselineHoursAnnual = (indicators: Indicator[]): number => {
  let totalHours = 0;

  indicators.forEach(ind => {
    if (ind.improvement_type === ImprovementType.PRODUCTIVITY || ind.improvement_type === ImprovementType.SPEED || ind.improvement_type === ImprovementType.DECISION_QUALITY) {
      (ind.baseline.people || []).forEach(person => {
        const freqAnual = calculateAnnualFrequency(person.frequencyQuantity, person.frequencyUnit);
        const horasPorExecucao = person.minutesSpent / 60;
        totalHours += horasPorExecucao * freqAnual;
      });
    }
  });

  return Math.round(totalHours);
};

// Calcular horas pós-IA anuais
const calculatePostIAHoursAnnual = (indicators: Indicator[]): number => {
  let totalHours = 0;

  indicators.forEach(ind => {
    if (ind.improvement_type === ImprovementType.PRODUCTIVITY || ind.improvement_type === ImprovementType.SPEED || ind.improvement_type === ImprovementType.DECISION_QUALITY) {
      (ind.postIA.people || []).forEach(person => {
        const freqAnual = calculateAnnualFrequency(person.frequencyQuantity, person.frequencyUnit);
        const horasPorExecucao = person.minutesSpent / 60;
        totalHours += horasPorExecucao * freqAnual;
      });
    }
  });

  return Math.round(totalHours);
};

// Calcular custo de mão de obra baseline anual
const calculateBaselineMOCost = (indicators: Indicator[]): number => {
  let totalCost = 0;

  indicators.forEach(ind => {
    if (ind.improvement_type === ImprovementType.PRODUCTIVITY || ind.improvement_type === ImprovementType.SPEED || ind.improvement_type === ImprovementType.DECISION_QUALITY) {
      (ind.baseline.people || []).forEach(person => {
        const freqAnual = calculateAnnualFrequency(person.frequencyQuantity, person.frequencyUnit);
        const horasPorExecucao = person.minutesSpent / 60;
        const horasAnuais = horasPorExecucao * freqAnual;
        totalCost += horasAnuais * person.hourlyRate;
      });
    }
  });

  return totalCost;
};

// Calcular custo de mão de obra pós-IA anual
const calculatePostIAMOCost = (indicators: Indicator[]): number => {
  let totalCost = 0;

  indicators.forEach(ind => {
    if (ind.improvement_type === ImprovementType.PRODUCTIVITY || ind.improvement_type === ImprovementType.SPEED || ind.improvement_type === ImprovementType.DECISION_QUALITY) {
      (ind.postIA.people || []).forEach(person => {
        const freqAnual = calculateAnnualFrequency(person.frequencyQuantity, person.frequencyUnit);
        const horasPorExecucao = person.minutesSpent / 60;
        const horasAnuais = horasPorExecucao * freqAnual;
        totalCost += horasAnuais * person.hourlyRate;
      });
    }
  });

  return totalCost;
};

// Calcular custo de IA anual (APIs mensais * 12 + custo por execução * frequência anual)
const calculateIACostAnnual = (projects: Project[], indicators: Indicator[]): number => {
  let totalCost = 0;

  projects.forEach(project => {
    // Custo mensal de APIs (monthly_maintenance_cost) * 12
    totalCost += project.monthly_maintenance_cost * 12;

    // Custo por execução (se houver em tools do postIA)
    const projectIndicators = indicators.filter(ind => ind.project_id === project.id && ind.is_active);
    projectIndicators.forEach(ind => {
      (ind.postIA.tools || []).forEach(tool => {
        // otherCosts pode representar custo por execução
        if (tool.otherCosts) {
          // Assumindo que otherCosts é custo por execução e precisamos multiplicar pela frequência anual
          // Para simplificar, vamos usar a frequência do primeiro person do postIA
          const firstPerson = ind.postIA.people?.[0];
          if (firstPerson) {
            const freqAnual = calculateAnnualFrequency(firstPerson.frequencyQuantity, firstPerson.frequencyUnit);
            totalCost += tool.otherCosts * freqAnual;
          }
        }
      });
    });
  });

  return totalCost;
};

// Calcular horas economizadas anuais (Horas_Baseline - Horas_PosIA)
export const calculateHoursSaved = (indicators: Indicator[]): number => {
  const horasBaseline = calculateBaselineHoursAnnual(indicators);
  const horasPosIA = calculatePostIAHoursAnnual(indicators);
  return Math.round(horasBaseline - horasPosIA);
};

// Calcular estatísticas KPI
export const calculateKPIStats = (projects: Project[], indicators: Indicator[]): KPIStats => {
  // Filtrar apenas projetos em produção para alguns cálculos
  const productionProjects = projects.filter(p => p.status === ProjectStatus.PRODUCTION);
  const completedProjects = projects.filter(p => p.status === ProjectStatus.COMPLETED);

  // Calcular economia anual total
  const economiaAnual = projects.reduce((sum, p) => {
    // Se o projeto tem total_economy_annual calculado, usar
    if (p.total_economy_annual) {
      return sum + p.total_economy_annual;
    }
    // Caso contrário, calcular a partir dos indicadores
    const projectIndicators = indicators.filter(ind => ind.project_id === p.id && ind.is_active);
    const projectEconomy = projectIndicators.reduce((acc, ind) => {
      const stats = calculateIndicatorStats(ind);
      return acc + stats.annualEconomy;
    }, 0);
    return sum + projectEconomy;
  }, 0);

  // Calcular ROI total (média dos ROIs de projetos em produção)
  const rois = productionProjects
    .map(p => {
      if (p.roi_percentage) return p.roi_percentage;
      // Calcular ROI se não estiver disponível
      const projectIndicators = indicators.filter(ind => ind.project_id === p.id && ind.is_active);
      const annualEconomy = projectIndicators.reduce((acc, ind) => {
        const stats = calculateIndicatorStats(ind);
        return acc + stats.annualEconomy;
      }, 0);
      const totalCost = p.implementation_cost + (p.monthly_maintenance_cost * 12);
      return totalCost > 0 ? ((annualEconomy - totalCost) / totalCost) * 100 : 0;
    })
    .filter(roi => roi > 0);

  const roiTotal = rois.length > 0 ? rois.reduce((a, b) => a + b, 0) / rois.length : 0;

  // Calcular horas economizadas
  const horasEconomizadasAno = calculateHoursSaved(indicators.filter(ind => ind.is_active));

  // Calcular payback médio (em meses)
  const paybacks = productionProjects
    .map(p => {
      const projectIndicators = indicators.filter(ind => ind.project_id === p.id && ind.is_active);
      const monthlyEconomy = projectIndicators.reduce((acc, ind) => {
        const stats = calculateIndicatorStats(ind);
        return acc + stats.monthlyEconomy;
      }, 0);

      if (monthlyEconomy > 0) {
        return p.implementation_cost / monthlyEconomy;
      }
      return null;
    })
    .filter((pb): pb is number => pb !== null && pb > 0);

  const paybackMedio = paybacks.length > 0
    ? paybacks.reduce((a, b) => a + b, 0) / paybacks.length
    : 0;

  // Calcular novos indicadores
  const activeIndicators = indicators.filter(ind => ind.is_active);
  const horasBaselineAno = calculateBaselineHoursAnnual(activeIndicators);
  const horasPosIAAno = calculatePostIAHoursAnnual(activeIndicators);
  const custoMOBaseline = calculateBaselineMOCost(activeIndicators);
  const custoMOPosIA = calculatePostIAMOCost(activeIndicators);
  const economiaMO = custoMOBaseline - custoMOPosIA;
  const custoIAAnual = calculateIACostAnnual(projects, activeIndicators);
  const economiaLiquida = economiaMO - custoIAAnual;

  // Calcular investimento total
  const investimentoTotal = projects.reduce((sum, p) => sum + p.implementation_cost, 0);

  // ROI calculado = ((Economia_Líquida - Investimento) ÷ Investimento) × 100
  const roiCalculado = investimentoTotal > 0 ? ((economiaLiquida - investimentoTotal) / investimentoTotal) * 100 : 0;

  // Payback calculado = Investimento ÷ (Economia_Líquida ÷ 12) [em meses]
  const paybackCalculado = economiaLiquida > 0 ? investimentoTotal / (economiaLiquida / 12) : 0;

  return {
    roi_total: Number(roiTotal.toFixed(1)),
    economia_anual: economiaAnual,
    horas_economizadas_ano: horasEconomizadasAno,
    projetos_producao: productionProjects.length,
    projetos_concluidos: completedProjects.length,
    payback_medio: Number(paybackMedio.toFixed(1)),
    horas_baseline_ano: horasBaselineAno,
    horas_posia_ano: horasPosIAAno,
    custo_mo_baseline: custoMOBaseline,
    custo_mo_posia: custoMOPosIA,
    economia_mo: economiaMO,
    custo_ia_anual: custoIAAnual,
    economia_liquida: economiaLiquida,
    roi_calculado: Number(roiCalculado.toFixed(2)),
    payback_calculado: Number(paybackCalculado.toFixed(1)),
  };
};

// Calcular histórico mensal de economia
export const calculateEconomyHistory = (projects: Project[], indicators: Indicator[]): EconomyHistoryItem[] => {
  const productionProjects = projects.filter(p => p.status === ProjectStatus.PRODUCTION);

  // Agrupar por mês baseado em go_live_date ou start_date
  const monthlyData: Record<string, { bruta: number; investimento: number }> = {};

  productionProjects.forEach(project => {
    const projectIndicators = indicators.filter(ind => ind.project_id === project.id && ind.is_active);
    const monthlyEconomy = projectIndicators.reduce((acc, ind) => {
      const stats = calculateIndicatorStats(ind);
      return acc + stats.monthlyEconomy;
    }, 0);

    // Usar go_live_date se disponível, senão start_date
    const referenceDate = project.go_live_date || project.start_date;
    const date = new Date(referenceDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short' });

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { bruta: 0, investimento: 0 };
    }

    monthlyData[monthKey].bruta += monthlyEconomy;
    monthlyData[monthKey].investimento += project.monthly_maintenance_cost;
  });

  // Converter para array e ordenar
  const history: EconomyHistoryItem[] = Object.entries(monthlyData)
    .map(([monthKey, data]) => {
      const [year, month] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return {
        month: date.toLocaleDateString('pt-BR', { month: 'short' }),
        bruta: Math.round(data.bruta),
        investimento: Math.round(data.investimento),
        liquida: Math.round(data.bruta - data.investimento),
      };
    })
    .sort((a, b) => {
      // Ordenar por data
      const dateA = new Date(a.month + ' 1');
      const dateB = new Date(b.month + ' 1');
      return dateA.getTime() - dateB.getTime();
    });

  // Se não houver histórico, criar dados acumulados dos últimos 6 meses
  if (history.length === 0) {
    const now = new Date();
    const last6Months: EconomyHistoryItem[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short' });

      // Calcular economia total dos projetos em produção
      const totalEconomy = productionProjects.reduce((sum, p) => {
        const projectIndicators = indicators.filter(ind => ind.project_id === p.id && ind.is_active);
        const monthlyEconomy = projectIndicators.reduce((acc, ind) => {
          const stats = calculateIndicatorStats(ind);
          return acc + stats.monthlyEconomy;
        }, 0);
        return sum + monthlyEconomy;
      }, 0);

      const totalInvestment = productionProjects.reduce((sum, p) => sum + p.monthly_maintenance_cost, 0);

      last6Months.push({
        month: monthLabel,
        bruta: Math.round(totalEconomy),
        investimento: Math.round(totalInvestment),
        liquida: Math.round(totalEconomy - totalInvestment),
      });
    }

    return last6Months;
  }

  // Retornar últimos 12 meses ou todos se menos de 12
  return history.slice(-12);
};

// Calcular distribuição por tipo de melhoria
export const calculateDistributionByType = (indicators: Indicator[]): DistributionItem[] => {
  const activeIndicators = indicators.filter(ind => ind.is_active);
  const distribution: Record<ImprovementType, number> = {} as Record<ImprovementType, number>;

  activeIndicators.forEach(ind => {
    const stats = calculateIndicatorStats(ind);
    if (!distribution[ind.improvement_type]) {
      distribution[ind.improvement_type] = 0;
    }
    distribution[ind.improvement_type] += stats.annualEconomy;
  });

  // Converter para array e mapear para labels
  return Object.entries(distribution)
    .map(([type, value]) => ({
      type: IMPROVEMENT_TYPE_LABELS[type as ImprovementType].label,
      value: Math.round(value),
      color: IMPROVEMENT_TYPE_LABELS[type as ImprovementType].color,
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);
};

// Serviço principal para buscar dados do dashboard
export const dashboardService = {
  async getDashboardData(organizationId?: string) {
    // Buscar projetos
    const projects = await projectService.getAll(organizationId);

    // Buscar indicadores de todos os projetos
    const allIndicators: Indicator[] = [];
    for (const project of projects) {
      try {
        const indicators = await indicatorService.getByProjectId(project.id);
        allIndicators.push(...indicators);
      } catch (error) {
        console.error(`Erro ao buscar indicadores do projeto ${project.id}:`, error);
      }
    }

    // Calcular estatísticas
    const stats = calculateKPIStats(projects, allIndicators);
    const economyHistory = calculateEconomyHistory(projects, allIndicators);
    const distributionByType = calculateDistributionByType(allIndicators);

    return {
      stats,
      economyHistory,
      distributionByType,
      projects,
      indicators: allIndicators,
    };
  },
};


import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { projectService, indicatorService } from '../services/projectService';
import { Project, Indicator, ProjectStatus, DevelopmentType, ImprovementType, FrequencyUnit, PersonInvolved, IndicatorData, ToolCost, CustomMetricUnit, CustomConfig } from '../types';
import { DEVELOPMENT_LABELS, STATUS_COLORS, IMPROVEMENT_LABELS } from '../constants';
import { aiPromptService } from '../services/aiPromptService';
import ConfirmModal from '../components/ConfirmModal';
import ToastContainer from '../components/ToastContainer';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'indicators'>('indicators');
  const [loading, setLoading] = useState(true);

  // IA States
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Dropdown state
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);

  // Toast e Confirm
  const { toasts, showToast, removeToast } = useToast();
  const { confirmState, confirm, handleCancel } = useConfirm();

  // Multiplicadores de frequência editáveis
  const [frequencyMultipliers, setFrequencyMultipliers] = useState<Record<FrequencyUnit, number>>(() => {
    const stored = localStorage.getItem('frequencyMultipliers');
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      [FrequencyUnit.HOUR]: 2080,
      [FrequencyUnit.DAY]: 260,
      [FrequencyUnit.WEEK]: 52,
      [FrequencyUnit.MONTH]: 12,
      [FrequencyUnit.QUARTER]: 4,
      [FrequencyUnit.YEAR]: 1,
    };
  });

  const updateFrequencyMultiplier = (unit: FrequencyUnit, value: number) => {
    const newMultipliers = { ...frequencyMultipliers, [unit]: value };
    setFrequencyMultipliers(newMultipliers);
    localStorage.setItem('frequencyMultipliers', JSON.stringify(newMultipliers));
  };

  const getFrequencyMultiplier = (unit: FrequencyUnit): number => {
    return frequencyMultipliers[unit] || 1;
  };

  useEffect(() => {
    loadProjectData();
  }, [id]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Fecha se clicar fora do dropdown e do botão
      if (showIndicatorMenu && !target.closest('[data-indicator-menu]')) {
        setShowIndicatorMenu(false);
      }
    };

    if (showIndicatorMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showIndicatorMenu]);

  const loadProjectData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [projectData, indicatorsData] = await Promise.all([
        projectService.getById(id),
        indicatorService.getByProjectId(id),
      ]);

      if (projectData) {
        setProject(projectData);
        // Sincronizar indicadores CUSTOM: garantir que pós-IA tenha mesma métrica e frequência do baseline
        const syncedIndicators = indicatorsData.map(ind => {
          if (ind.improvement_type === ImprovementType.CUSTOM) {
            return {
              ...ind,
              postIA: {
                ...ind.postIA,
                customMetricUnit: ind.baseline.customMetricUnit || CustomMetricUnit.CURRENCY,
                customFrequencyUnit: ind.baseline.customMetricUnit === CustomMetricUnit.CURRENCY
                  ? (ind.baseline.customFrequencyUnit || FrequencyUnit.MONTH)
                  : undefined
              }
            };
          }
          return ind;
        });
        setIndicators(syncedIndicators);
      }
    } catch (error) {
      console.error('Erro ao carregar projeto:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnnualFrequency = (frequencyQuantity: number, frequencyUnit: FrequencyUnit): number => {
    return frequencyQuantity * getFrequencyMultiplier(frequencyUnit);
  };

  // Calcular métricas do projeto
  const calculateProjectMetrics = () => {
    const activeIndicators = indicators.filter(ind => ind.is_active);

    // Horas Baseline/Ano
    let horasBaselineAno = 0;
    activeIndicators.forEach(ind => {
      if (ind.improvement_type === ImprovementType.PRODUCTIVITY || ind.improvement_type === ImprovementType.SPEED || ind.improvement_type === ImprovementType.DECISION_QUALITY) {
        (ind.baseline.people || []).forEach(person => {
          const freqAnual = calculateAnnualFrequency(person.frequencyQuantity, person.frequencyUnit);
          const horasPorExecucao = person.minutesSpent / 60;
          horasBaselineAno += horasPorExecucao * freqAnual;
        });
      }
    });

    // Horas Pós-IA/Ano
    let horasPosIAAno = 0;
    activeIndicators.forEach(ind => {
      if (ind.improvement_type === ImprovementType.PRODUCTIVITY || ind.improvement_type === ImprovementType.SPEED || ind.improvement_type === ImprovementType.DECISION_QUALITY) {
        (ind.postIA.people || []).forEach(person => {
          const freqAnual = calculateAnnualFrequency(person.frequencyQuantity, person.frequencyUnit);
          const horasPorExecucao = person.minutesSpent / 60;
          horasPosIAAno += horasPorExecucao * freqAnual;
        });
      }
    });

    // Custo MO Baseline
    let custoMOBaseline = 0;
    activeIndicators.forEach(ind => {
      if (ind.improvement_type === ImprovementType.PRODUCTIVITY || ind.improvement_type === ImprovementType.SPEED || ind.improvement_type === ImprovementType.DECISION_QUALITY) {
        (ind.baseline.people || []).forEach(person => {
          const freqAnual = calculateAnnualFrequency(person.frequencyQuantity, person.frequencyUnit);
          const horasPorExecucao = person.minutesSpent / 60;
          const horasAnuais = horasPorExecucao * freqAnual;
          custoMOBaseline += horasAnuais * person.hourlyRate;
        });
      }
    });

    // Custo MO Pós-IA
    let custoMOPosIA = 0;
    activeIndicators.forEach(ind => {
      if (ind.improvement_type === ImprovementType.PRODUCTIVITY || ind.improvement_type === ImprovementType.SPEED || ind.improvement_type === ImprovementType.DECISION_QUALITY) {
        (ind.postIA.people || []).forEach(person => {
          const freqAnual = calculateAnnualFrequency(person.frequencyQuantity, person.frequencyUnit);
          const horasPorExecucao = person.minutesSpent / 60;
          const horasAnuais = horasPorExecucao * freqAnual;
          custoMOPosIA += horasAnuais * person.hourlyRate;
        });
      }
    });

    // Economia MO
    const economiaMO = custoMOBaseline - custoMOPosIA;

    // Custo IA Anual - apenas custos marcados como "com IA"
    let custoIAAnual = 0;
    activeIndicators.forEach(ind => {
      if (ind.improvement_type === ImprovementType.RELATED_COSTS) {
        (ind.baseline.tools || []).forEach(tool => {
          // Só considerar custos marcados como "com IA"
          if ((tool as any).isIACost) {
            const freqQty = (tool as any).frequencyQuantity || 0;
            const freqUnit = (tool as any).frequencyUnit || FrequencyUnit.MONTH;
            const multiplier = getFrequencyMultiplier(freqUnit);
            custoIAAnual += tool.monthlyCost * freqQty * multiplier;
          }
        });
      }
    });

    // Economia Líquida
    const economiaLiquida = economiaMO - custoIAAnual;

    // ROI Calculado
    const investimento = project.implementation_cost;
    const roiCalculado = investimento > 0 ? ((economiaLiquida - investimento) / investimento) * 100 : 0;

    // Payback Calculado
    const paybackCalculado = economiaLiquida > 0 ? investimento / (economiaLiquida / 12) : 0;

    return {
      horasBaselineAno: Math.round(horasBaselineAno),
      horasPosIAAno: Math.round(horasPosIAAno),
      custoMOBaseline: custoMOBaseline,
      custoMOPosIA: custoMOPosIA,
      economiaMO: economiaMO,
      custoIAAnual: custoIAAnual,
      economiaLiquida: economiaLiquida,
      roiCalculado: Number(roiCalculado.toFixed(2)),
      paybackCalculado: Number(paybackCalculado.toFixed(1)),
    };
  };

  // Função auxiliar para calcular multiplicador anual
  const calculateAnnualMultiplier = (unit: FrequencyUnit): number => {
    return getFrequencyMultiplier(unit);
  };

  // Função para calcular melhoria do indicador CUSTOM baseado na direção
  const calculateCustomImprovement = (baseline: number, postIA: number, direction: 'increase' | 'decrease'): number => {
    if (!baseline || baseline === 0) return 0;

    if (direction === 'decrease') {
      return ((baseline - postIA) / baseline) * 100;
    }

    return ((postIA - baseline) / baseline) * 100;
  };

  // Função para calcular estatísticas de um indicador
  const calculateIndicatorStats = (ind: Indicator) => {
    // 1. Cálculo de Custo de Pessoas (Normalizado para Mensal)
    const calcNormalizedMonthlyPeopleCost = (data: IndicatorData) => {
      return (data.people || []).reduce((acc, p) => {
        const annualFreq = p.frequencyQuantity * calculateAnnualMultiplier(p.frequencyUnit);
        const monthlyFreq = annualFreq / 12;
        const costPerExecution = (p.minutesSpent / 60) * p.hourlyRate;
        return acc + (costPerExecution * monthlyFreq);
      }, 0);
    };

    // 2. Cálculo de Ferramentas (Mensal)
    const calcMonthlyToolCost = (data: IndicatorData) => {
      return (data.tools || []).reduce((acc, t) => acc + t.monthlyCost, 0);
    };

    // 3. Cálculo de Tempo Economizado Mensal (em horas) - para SPEED
    const calcMonthlyTimeSaved = () => {
      if (ind.improvement_type !== ImprovementType.SPEED) return 0;

      let totalMinutesSaved = 0;
      const baselinePeople = ind.baseline.people || [];
      const postIAPeople = ind.postIA.people || [];

      // Comparar cada pessoa do baseline com a correspondente do pós-IA
      baselinePeople.forEach((baselinePerson, idx) => {
        const postIAPerson = postIAPeople[idx];
        if (postIAPerson) {
          const minutesDiff = baselinePerson.minutesSpent - postIAPerson.minutesSpent;
          if (minutesDiff > 0) {
            const annualFreq = baselinePerson.frequencyQuantity * calculateAnnualMultiplier(baselinePerson.frequencyUnit);
            const monthlyFreq = annualFreq / 12;
            totalMinutesSaved += minutesDiff * monthlyFreq;
          }
        }
      });

      return totalMinutesSaved / 60; // Converter minutos para horas
    };

    const baselinePeople = calcNormalizedMonthlyPeopleCost(ind.baseline);
    const baselineTools = calcMonthlyToolCost(ind.baseline);
    const postIAPeople = calcNormalizedMonthlyPeopleCost(ind.postIA);
    const postIATools = calcMonthlyToolCost(ind.postIA);

    // Custos Operacionais Base
    const totalBaselineMonthly = baselinePeople + baselineTools + (ind.baseline.cost || 0);
    const totalPostIAMonthly = postIAPeople + postIATools + (ind.postIA.cost || 0);

    let monthlyEconomy = 0;
    let improvementPct = "0";

    // 3. LÓGICA DE NEGÓCIO POR TIPO DE MELHORIA
    switch (ind.improvement_type) {
      case ImprovementType.PRODUCTIVITY:
      case ImprovementType.SPEED:
      case ImprovementType.DECISION_QUALITY:
        // Economia direta de tempo/recurso no processo atual
        let baselineCost = totalBaselineMonthly;
        let postIACost = totalPostIAMonthly;

        if (ind.improvement_type === ImprovementType.DECISION_QUALITY) {
          baselineCost += (ind.baseline.decisionCount || 0) * (1 - (ind.baseline.accuracyPct || 0) / 100) * (ind.baseline.errorCost || 0);
          postIACost += (ind.postIA.decisionCount || 0) * (1 - (ind.postIA.accuracyPct || 0) / 100) * (ind.postIA.errorCost || 0);
        }

        monthlyEconomy = baselineCost - postIACost;
        improvementPct = baselineCost > 0 ? ((baselineCost - postIACost) / baselineCost * 100).toFixed(1) : "0";
        break;

      case ImprovementType.ANALYTICAL_CAPACITY:
        /** * CORREÇÃO: CUSTO EVITADO (Avoided Cost)
         * Se o volume aumentou, quanto custaria fazer esse NOVO volume no método antigo?
         */
        const unitCostBaseline = ind.baseline.volume && ind.baseline.volume > 0
          ? totalBaselineMonthly / ind.baseline.volume
          : (ind.baseline.cost || 0); // fallback para custo informado manual

        const costToScaleManual = unitCostBaseline * (ind.postIA.volume || 1);
        monthlyEconomy = costToScaleManual - totalPostIAMonthly;
        improvementPct = costToScaleManual > 0 ? (((costToScaleManual - totalPostIAMonthly) / costToScaleManual) * 100).toFixed(1) : "0";
        break;

      case ImprovementType.REVENUE_INCREASE:
        // Aplica-se a margem sobre o aumento de receita (se disponível no types)
        const margin = (ind.postIA as any).marginPct || 1; // 1 = 100% se não preenchido
        const revenueGain = (ind.postIA.revenue || 0) - (ind.baseline.revenue || 0);
        monthlyEconomy = (revenueGain * margin) - totalPostIAMonthly;
        improvementPct = ind.baseline.revenue ? (((revenueGain * margin) / ind.baseline.revenue) * 100).toFixed(1) : "100";
        break;

      case ImprovementType.MARGIN_IMPROVEMENT:
        const marginBaseline = (ind.baseline.revenue || 0) - (ind.baseline.cost || 0);
        const marginPost = (ind.postIA.revenue || 0) - (ind.postIA.cost || 0);
        monthlyEconomy = marginPost - marginBaseline;
        improvementPct = marginBaseline !== 0 ? ((marginPost - marginBaseline) / Math.abs(marginBaseline) * 100).toFixed(1) : "100";
        break;

      case ImprovementType.RISK_REDUCTION:
        // (Probabilidade x Impacto) Anterior - (Probabilidade x Impacto) Atual
        const riskBefore = (ind.baseline.probability || 0) / 100 * (ind.baseline.impact || 0);
        const riskAfter = (ind.postIA.probability || 0) / 100 * (ind.postIA.impact || 0);
        monthlyEconomy = ((riskBefore - riskAfter) / 12) + ((ind.baseline.mitigationCost || 0) - (ind.postIA.mitigationCost || 0)); // impacto anualizado para mensal
        improvementPct = riskBefore > 0 ? (((riskBefore - riskAfter) / riskBefore) * 100).toFixed(1) : "0";
        break;

      case ImprovementType.SATISFACTION:
        const churnBeforeVal = (ind.baseline.churnRate || 0) / 100 * (ind.baseline.clientCount || 0) * (ind.baseline.valuePerClient || 0);
        const churnAfterVal = (ind.postIA.churnRate || 0) / 100 * (ind.postIA.clientCount || 0) * (ind.postIA.valuePerClient || 0);
        monthlyEconomy = (churnBeforeVal - churnAfterVal) + ((ind.postIA.revenue || 0) - (ind.baseline.revenue || 0));
        improvementPct = (ind.postIA.score && ind.baseline.score) ? (((ind.postIA.score - ind.baseline.score) / ind.baseline.score) * 100).toFixed(1) : "0";
        break;

      case ImprovementType.RELATED_COSTS:
        // Calcular custo anual baseline baseado em tools com frequência
        const relatedCostsBaselineAnnual = (ind.baseline.tools || []).reduce((acc, tool) => {
          const freqQty = (tool as any).frequencyQuantity || 1;
          const freqUnit = (tool as any).frequencyUnit || FrequencyUnit.MONTH;
          const multiplier = getFrequencyMultiplier(freqUnit);
          return acc + (tool.monthlyCost * freqQty * multiplier);
        }, 0);
        // Calcular custo anual pós-IA baseado em tools com frequência
        const relatedCostsPostIAAnnual = (ind.postIA.tools || []).reduce((acc, tool) => {
          const freqQty = (tool as any).frequencyQuantity || 1;
          const freqUnit = (tool as any).frequencyUnit || FrequencyUnit.MONTH;
          const multiplier = getFrequencyMultiplier(freqUnit);
          return acc + (tool.monthlyCost * freqQty * multiplier);
        }, 0);
        // Economia = Baseline - Pós-IA
        const relatedCostsEconomyAnnual = relatedCostsBaselineAnnual - relatedCostsPostIAAnnual;
        monthlyEconomy = relatedCostsEconomyAnnual / 12; // Converter anual para mensal
        improvementPct = relatedCostsBaselineAnnual > 0 ? (((relatedCostsBaselineAnnual - relatedCostsPostIAAnnual) / relatedCostsBaselineAnnual) * 100).toFixed(1) : "0";
        break;

      case ImprovementType.CUSTOM:
        // Nova lógica flexível para CUSTOM baseada em customConfig
        const customConfig = ind.baseline.customConfig || {
          direction: 'decrease',
          unitType: 'quantity',
          hasFinancialImpact: false
        };

        const baselineValue = ind.baseline.customValue || 0;
        const postIAValue = ind.postIA.customValue || 0;

        // Calcular melhoria percentual baseada na direção
        improvementPct = calculateCustomImprovement(baselineValue, postIAValue, customConfig.direction).toFixed(1);

        // Calcular impacto financeiro SOMENTE se hasFinancialImpact = true
        if (customConfig.hasFinancialImpact && customConfig.unitCost && customConfig.volume) {
          // economy = (baseline - postIA) * volume * unitCost
          const difference = customConfig.direction === 'decrease'
            ? baselineValue - postIAValue
            : postIAValue - baselineValue;
          monthlyEconomy = difference * customConfig.volume * customConfig.unitCost;
        } else {
          // Se não tem impacto financeiro, não calcular economia
          monthlyEconomy = 0;
        }
        break;

      default:
        monthlyEconomy = totalBaselineMonthly - totalPostIAMonthly;
        improvementPct = totalBaselineMonthly > 0 ? (((totalBaselineMonthly - totalPostIAMonthly) / totalBaselineMonthly) * 100).toFixed(1) : "0";
    }

    const monthlyTimeSaved = calcMonthlyTimeSaved();

    // Garantir que os valores são números válidos
    const validMonthlyEconomy = isNaN(monthlyEconomy) ? 0 : monthlyEconomy;
    const validImprovementPct = improvementPct || "0";

    // Determinar unidade de exibição para indicadores CUSTOM
    let economyUnit = 'R$/mês';
    let economyValue = validMonthlyEconomy;

    if (ind.improvement_type === ImprovementType.CUSTOM) {
      const customConfig = ind.baseline.customConfig || {
        direction: 'decrease',
        unitType: 'quantity',
        hasFinancialImpact: false
      };

      const baselineValue = ind.baseline.customValue || 0;
      const postIAValue = ind.postIA.customValue || 0;

      // Determinar unidade de exibição baseada em unitType
      const displayUnit = customConfig.unitType === 'currency'
        ? 'R$'
        : customConfig.unitType === 'percentage'
          ? '%'
          : customConfig.unitType === 'time'
            ? 'horas'
            : customConfig.unitType === 'quantity'
              ? 'unidades'
              : customConfig.unitLabel || '';

      economyUnit = displayUnit;

      // Calcular valor de economia baseado na direção
      if (customConfig.unitType === 'percentage') {
        // Para porcentagem, mostrar a diferença percentual
        economyValue = customConfig.direction === 'decrease'
          ? baselineValue - postIAValue
          : postIAValue - baselineValue;
      } else {
        // Para outros tipos, mostrar diferença absoluta
        economyValue = customConfig.direction === 'decrease'
          ? baselineValue - postIAValue
          : postIAValue - baselineValue;
      }

      // Se tem impacto financeiro, mostrar também em R$/mês
      if (customConfig.hasFinancialImpact) {
        economyUnit = `${displayUnit} (R$ ${validMonthlyEconomy.toFixed(2)}/mês)`;
      }
    }

    return {
      monthlyEconomy: validMonthlyEconomy.toFixed(2),
      annualEconomy: validMonthlyEconomy * 12,
      improvementPct: validImprovementPct,
      monthlyTimeSaved: monthlyTimeSaved.toFixed(2), // Horas economizadas por mês (apenas para SPEED)
      // Para indicadores CUSTOM, adicionar informações de exibição
      economyUnit: ind.improvement_type === ImprovementType.CUSTOM ? economyUnit : 'R$/mês',
      economyValue: ind.improvement_type === ImprovementType.CUSTOM ? economyValue : validMonthlyEconomy,
      customMetric: ind.improvement_type === ImprovementType.CUSTOM
        ? (ind.baseline.customConfig?.unitType === 'custom'
          ? ind.baseline.customConfig?.unitLabel
          : ind.baseline.customConfig?.unitType)
        : undefined
    };
  };

  // Função para recalcular e atualizar ROI do projeto
  const recalculateAndUpdateProject = useCallback(async (currentProject?: Project) => {
    const projectToUse = currentProject || project;
    if (!projectToUse) return;

    // Calcular ROI total baseado nos indicadores
    const totalEconomy = indicators.reduce((sum, ind) => {
      const stats = calculateIndicatorStats(ind);
      return sum + parseFloat(stats.monthlyEconomy || '0.00');
    }, 0);

    const annualEconomy = totalEconomy * 12;
    const totalCost = projectToUse.implementation_cost + (projectToUse.monthly_maintenance_cost * 12);
    const roiPercentage = totalCost > 0 ? ((annualEconomy - totalCost) / totalCost) * 100 : 0;

    try {
      const updated = await projectService.update(projectToUse.id, {
        ...projectToUse,
        total_economy_annual: annualEconomy,
        roi_percentage: roiPercentage,
      });

      setProject(updated);
    } catch (error) {
      console.error('Erro ao atualizar ROI:', error);
    }
  }, [project, indicators]);

  // Salvar indicador quando houver mudanças (com debounce)
  const saveIndicator = useCallback(async (indicator: Indicator) => {
    try {
      await indicatorService.update(indicator.id, indicator);
      // Recalcular ROI após salvar
      await recalculateAndUpdateProject();
    } catch (error) {
      console.error('Erro ao salvar indicador:', error);
    }
  }, [recalculateAndUpdateProject]);

  // Salvar projeto quando houver mudanças
  const saveProject = useCallback(async (updates: Partial<Project>, currentProject?: Project) => {
    const projectToUpdate = currentProject || project;
    if (!projectToUpdate) return;
    try {
      const updated = await projectService.update(projectToUpdate.id, {
        ...projectToUpdate,
        ...updates,
      });
      setProject(updated);

      // Se os custos foram alterados, recalcular ROI usando o projeto atualizado
      if (updates.implementation_cost !== undefined || updates.monthly_maintenance_cost !== undefined) {
        await recalculateAndUpdateProject(updated);
      }
    } catch (error) {
      console.error('Erro ao salvar projeto:', error);
    }
  }, [project, recalculateAndUpdateProject]);

  if (loading) {
    return <div className="p-10 text-center">Carregando...</div>;
  }

  if (!project) return <div className="p-10 text-center">Projeto não encontrado.</div>;

  const generateProjectAIInsight = async () => {
    setLoadingAi(true);
    try {
      // Usa a função do serviço que busca dados dos indicadores do banco e gera o insight
      const insight = await aiPromptService.generateProjectInsight(id!);
      setAiInsight(insight);
    } catch (err) {
      console.error(err);
      setAiInsight("Erro ao processar insight da IA.");
    } finally {
      setLoadingAi(false);
    }
  };

  const updateIndicatorData = async (idx: number, side: 'baseline' | 'postIA', field: keyof IndicatorData, value: any) => {
    const newArr = [...indicators];
    newArr[idx] = {
      ...newArr[idx],
      [side]: { ...newArr[idx][side], [field]: value }
    };
    setIndicators(newArr);
    // Salvar automaticamente após mudança
    await saveIndicator(newArr[idx]);
  };

  const updatePerson = async (idx: number, side: 'baseline' | 'postIA', pIdx: number, field: keyof PersonInvolved, value: any) => {
    const newArr = [...indicators];
    const people = [...(newArr[idx][side].people || [])];
    people[pIdx] = { ...people[pIdx], [field]: value };
    newArr[idx][side].people = people;
    setIndicators(newArr);
    // Salvar automaticamente após mudança
    await saveIndicator(newArr[idx]);
  };

  const addPerson = async (idx: number) => {
    const newArr = [...indicators];
    const newPerson: PersonInvolved = {
      id: Date.now().toString(),
      name: 'Novo Colaborador',
      role: 'Analista',
      hourlyRate: 0,
      minutesSpent: 0,
      frequencyQuantity: 0,
      frequencyUnit: FrequencyUnit.MONTH
    };
    newArr[idx].baseline.people = [...(newArr[idx].baseline.people || []), { ...newPerson }];
    newArr[idx].postIA.people = [...(newArr[idx].postIA.people || []), { ...newPerson }];
    setIndicators(newArr);
    // Salvar automaticamente após adicionar
    await saveIndicator(newArr[idx]);
  };

  const removePerson = async (idx: number, pIdx: number) => {
    const newArr = [...indicators];
    newArr[idx].baseline.people = (newArr[idx].baseline.people || []).filter((_, i) => i !== pIdx);
    newArr[idx].postIA.people = (newArr[idx].postIA.people || []).filter((_, i) => i !== pIdx);
    setIndicators(newArr);
    // Salvar automaticamente após remover
    await saveIndicator(newArr[idx]);
  };

  // Funções para gerenciar custos relacionados
  interface RelatedCost {
    id: string;
    name: string;
    cost: number;
    frequencyQuantity: number;
    frequencyUnit: FrequencyUnit;
    isIACost?: boolean;
  }

  const getRelatedCosts = (ind: Indicator): RelatedCost[] => {
    if (!ind.baseline.tools) return [];
    return ind.baseline.tools.map(tool => ({
      id: tool.id,
      name: tool.name,
      cost: tool.monthlyCost,
      frequencyQuantity: (tool as any).frequencyQuantity || 1,
      frequencyUnit: (tool as any).frequencyUnit || FrequencyUnit.MONTH,
      isIACost: (tool as any).isIACost ?? false,
    }));
  };

  const getRelatedCostsPostIA = (ind: Indicator): RelatedCost[] => {
    if (!ind.postIA.tools) return [];
    return ind.postIA.tools.map(tool => ({
      id: tool.id,
      name: tool.name,
      cost: tool.monthlyCost,
      frequencyQuantity: (tool as any).frequencyQuantity || 1,
      frequencyUnit: (tool as any).frequencyUnit || FrequencyUnit.MONTH,
      isIACost: (tool as any).isIACost ?? false,
    }));
  };

  const addRelatedCost = async (idx: number) => {
    const newArr = [...indicators];
    const newCost: RelatedCost = {
      id: Date.now().toString(),
      name: 'Novo Custo',
      cost: 0,
      frequencyQuantity: 1,
      frequencyUnit: FrequencyUnit.MONTH,
      isIACost: false,
    };
    if (!newArr[idx].baseline.tools) {
      newArr[idx].baseline.tools = [];
    }
    newArr[idx].baseline.tools.push({
      id: newCost.id,
      name: newCost.name,
      monthlyCost: newCost.cost,
      otherCosts: newCost.frequencyQuantity,
    } as any);
    (newArr[idx].baseline.tools[newArr[idx].baseline.tools.length - 1] as any).frequencyQuantity = newCost.frequencyQuantity;
    (newArr[idx].baseline.tools[newArr[idx].baseline.tools.length - 1] as any).frequencyUnit = newCost.frequencyUnit;
    (newArr[idx].baseline.tools[newArr[idx].baseline.tools.length - 1] as any).isIACost = newCost.isIACost;
    setIndicators(newArr);
    await saveIndicator(newArr[idx]);
  };

  const addRelatedCostPostIA = async (idx: number) => {
    const newArr = [...indicators];
    const newCost: RelatedCost = {
      id: Date.now().toString(),
      name: 'Novo Custo Pós-IA',
      cost: 0,
      frequencyQuantity: 1,
      frequencyUnit: FrequencyUnit.MONTH,
      isIACost: false,
    };
    if (!newArr[idx].postIA.tools) {
      newArr[idx].postIA.tools = [];
    }
    newArr[idx].postIA.tools.push({
      id: newCost.id,
      name: newCost.name,
      monthlyCost: newCost.cost,
      otherCosts: newCost.frequencyQuantity,
    } as any);
    (newArr[idx].postIA.tools[newArr[idx].postIA.tools.length - 1] as any).frequencyQuantity = newCost.frequencyQuantity;
    (newArr[idx].postIA.tools[newArr[idx].postIA.tools.length - 1] as any).frequencyUnit = newCost.frequencyUnit;
    (newArr[idx].postIA.tools[newArr[idx].postIA.tools.length - 1] as any).isIACost = newCost.isIACost;
    setIndicators(newArr);
    await saveIndicator(newArr[idx]);
  };

  const updateRelatedCost = async (idx: number, costIdx: number, field: keyof RelatedCost, value: any) => {
    const newArr = [...indicators];
    const tool = newArr[idx].baseline.tools?.[costIdx];
    if (tool) {
      if (field === 'name') tool.name = value;
      if (field === 'cost') tool.monthlyCost = value;
      if (field === 'frequencyQuantity') (tool as any).frequencyQuantity = value;
      if (field === 'frequencyUnit') (tool as any).frequencyUnit = value;
      if (field === 'isIACost') (tool as any).isIACost = value;
    }
    setIndicators(newArr);
    await saveIndicator(newArr[idx]);
  };

  const updateRelatedCostPostIA = async (idx: number, costIdx: number, field: keyof RelatedCost, value: any) => {
    const newArr = [...indicators];
    const tool = newArr[idx].postIA.tools?.[costIdx];
    if (tool) {
      if (field === 'name') tool.name = value;
      if (field === 'cost') tool.monthlyCost = value;
      if (field === 'frequencyQuantity') (tool as any).frequencyQuantity = value;
      if (field === 'frequencyUnit') (tool as any).frequencyUnit = value;
      if (field === 'isIACost') (tool as any).isIACost = value;
    }
    setIndicators(newArr);
    await saveIndicator(newArr[idx]);
  };

  const removeRelatedCost = async (idx: number, costIdx: number) => {
    const newArr = [...indicators];
    newArr[idx].baseline.tools = (newArr[idx].baseline.tools || []).filter((_, i) => i !== costIdx);
    setIndicators(newArr);
    await saveIndicator(newArr[idx]);
  };

  const removeRelatedCostPostIA = async (idx: number, costIdx: number) => {
    const newArr = [...indicators];
    newArr[idx].postIA.tools = (newArr[idx].postIA.tools || []).filter((_, i) => i !== costIdx);
    setIndicators(newArr);
    await saveIndicator(newArr[idx]);
  };

  const addIndicator = async (type: ImprovementType) => {
    if (!id) return;

    const newInd: Omit<Indicator, 'id'> = {
      project_id: id,
      name: `Novo Indicador - ${IMPROVEMENT_LABELS[type]}`,
      description: '',
      improvement_type: type,
      baseline: type === ImprovementType.CUSTOM
        ? {
          customValue: 0,
          customConfig: {
            direction: 'decrease',
            unitType: 'quantity',
            hasFinancialImpact: false
          }
        }
        : { people: [] },
      postIA: type === ImprovementType.CUSTOM
        ? { customValue: 0 }
        : { people: [] },
      is_active: true,
    };

    try {
      const saved = await indicatorService.create(newInd);
      setIndicators([...indicators, saved]);
      showToast('Indicador criado com sucesso!', 'success');
      // Scroll para o novo card criado
      setTimeout(() => {
        const newCard = document.querySelector(`[data-indicator-id="${saved.id}"]`);
        if (newCard) {
          newCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    } catch (error) {
      console.error('Erro ao criar indicador:', error);
      showToast('Erro ao salvar indicador', 'error');
    }
  };

  const removeIndicator = async (idx: number) => {
    const confirmed = await confirm({
      title: 'Excluir Indicador',
      message: 'Tem certeza que deseja excluir este indicador? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (!confirmed) return;

    const indicator = indicators[idx];
    try {
      await indicatorService.delete(indicator.id);
      setIndicators(indicators.filter((_, i) => i !== idx));
      // Recalcular ROI após remover
      await recalculateAndUpdateProject();
      showToast('Indicador excluído com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao deletar indicador:', error);
      showToast('Erro ao deletar indicador', 'error');
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
        onConfirm={() => confirmState.onConfirm?.()}
        onCancel={handleCancel}
      />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/projects')} className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h2 className="text-2xl font-bold">{project.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[project.status]}`}>{project.status}</span>
                <span className="text-slate-400 dark:text-slate-500 text-xs">• {DEVELOPMENT_LABELS[project.development_type]}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={generateProjectAIInsight}
              disabled={loadingAi}
              className="flex items-center gap-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-600 hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition-all border border-indigo-600/20 disabled:opacity-50"
            >
              {loadingAi ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              )}
              Insight do Projeto
            </button>
            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <button onClick={() => setActiveTab('indicators')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'indicators' ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Indicadores e ROI</button>
              <button onClick={() => setActiveTab('details')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'details' ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Configurações</button>
            </div>
          </div>
        </div>

        {aiInsight && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-5 rounded-2xl flex gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-indigo-600 p-2.5 rounded-xl h-fit text-white shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            </div>
            <div className="flex-1">
              <h4 className="font-black text-indigo-900 dark:text-indigo-100 text-xs uppercase tracking-widest mb-1">Análise Estratégica IA</h4>
              <div className="text-indigo-800 dark:text-indigo-200 text-sm leading-relaxed font-medium prose prose-indigo dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold text-indigo-900 dark:text-indigo-100">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                  }}
                >
                  {aiInsight}
                </ReactMarkdown>
              </div>
            </div>
            <button onClick={() => setAiInsight(null)} className="ml-auto text-indigo-400 hover:text-indigo-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-indigo-700 dark:bg-indigo-800 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Impacto Total Estimado</p>
              <h3 className="text-3xl font-black">R$ {(indicators.reduce((acc, ind) => acc + calculateIndicatorStats(ind).annualEconomy, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-normal opacity-70">/ano</span></h3>
              <div className="mt-4 pt-4 border-t border-indigo-600/50 flex justify-between items-end">
                <div>
                  <p className="text-indigo-200 text-[10px] font-bold uppercase">ROI Estimado</p>
                  <p className="text-xl font-bold">+{project.roi_percentage || calculateProjectMetrics().roiCalculado}%</p>
                </div>
                <div className="text-right">
                  <p className="text-indigo-200 text-[10px] font-bold uppercase">Payback</p>
                  <p className="text-xl font-bold">{calculateProjectMetrics().paybackCalculado}m</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <h4 className="font-bold text-sm mb-3">Custos de Projeto</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Implementação</span>
                  <span className="font-bold">R$ {project.implementation_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Manutenção Mensal</span>
                  <span className="font-bold">R$ {project.monthly_maintenance_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {(() => {
              const metrics = calculateProjectMetrics();
              return (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <h4 className="font-bold text-sm mb-3">Horas Baseline/Ano</h4>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{metrics.horasBaselineAno.toLocaleString()}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <h4 className="font-bold text-sm mb-3">Horas Pós-IA/Ano</h4>
                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{metrics.horasPosIAAno.toLocaleString()}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <h4 className="font-bold text-sm mb-3">Custo MO Baseline</h4>
                    <p className="text-2xl font-black text-red-600 dark:text-red-400">R$ {metrics.custoMOBaseline.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <h4 className="font-bold text-sm mb-3">Custo MO Pós-IA</h4>
                    <p className="text-2xl font-black text-purple-600 dark:text-purple-400">R$ {metrics.custoMOPosIA.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <h4 className="font-bold text-sm mb-3">Economia MO</h4>
                    <p className="text-2xl font-black text-green-600 dark:text-green-400">R$ {metrics.economiaMO.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <h4 className="font-bold text-sm mb-3">Custo IA Anual</h4>
                    <p className="text-2xl font-black text-yellow-600 dark:text-yellow-400">R$ {metrics.custoIAAnual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <h4 className="font-bold text-sm mb-3">Economia Líquida</h4>
                    <p className="text-2xl font-black text-green-600 dark:text-green-400">R$ {metrics.economiaLiquida.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <h4 className="font-bold text-sm mb-3">ROI Calculado</h4>
                    <p className="text-2xl font-black text-green-600 dark:text-green-400">{metrics.roiCalculado >= 0 ? '+' : ''}{metrics.roiCalculado}%</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <h4 className="font-bold text-sm mb-3">Payback Calculado</h4>
                    <p className="text-2xl font-black text-orange-600 dark:text-orange-400">{metrics.paybackCalculado}m</p>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="lg:col-span-3 space-y-6">
            {activeTab === 'indicators' ? (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Gestão de ROI por Indicador</h3>
                  <div className="relative" data-indicator-menu>
                    <button
                      onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                      Adicionar Novo Tipo de Ganho
                    </button>
                    {showIndicatorMenu && (
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                        {Object.entries(IMPROVEMENT_LABELS).map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => {
                              addIndicator(key as ImprovementType);
                              setShowIndicatorMenu(false);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 border-b border-slate-50 dark:border-slate-700 last:border-0 transition-colors"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-8 pb-20">
                  {indicators.map((ind, idx) => {
                    const stats = calculateIndicatorStats(ind);
                    return (
                      <div key={ind.id} data-indicator-id={ind.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden group transition-all">
                        <div className="p-5 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                          <div className="flex items-center gap-3 flex-1 mr-4">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <div className="flex-1">
                              <input
                                className="font-bold bg-transparent focus:outline-none border-b border-transparent focus:border-indigo-500 text-lg w-full"
                                value={ind.name}
                                onChange={async (e) => {
                                  const newArr = [...indicators];
                                  newArr[idx].name = e.target.value;
                                  setIndicators(newArr);
                                  // Salvar após mudança de nome
                                  await saveIndicator(newArr[idx]);
                                }}
                                placeholder="Nome do indicador..."
                              />
                              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{IMPROVEMENT_LABELS[ind.improvement_type]}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Impacto Anual</p>
                              <p className="font-black text-green-500 dark:text-green-400 text-xl">R$ {stats.annualEconomy.toLocaleString()}</p>
                            </div>
                            <button onClick={() => removeIndicator(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12 ">
                          {/* Baseline Section */}
                          <div className={`space-y-6 ${ind.improvement_type === ImprovementType.RELATED_COSTS ? 'md:col-span-1' : ''}`}>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                              <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Situação Atual (Baseline)</h4>
                            </div>

                            {(ind.improvement_type === ImprovementType.PRODUCTIVITY || ind.improvement_type === ImprovementType.SPEED || ind.improvement_type === ImprovementType.DECISION_QUALITY) && (
                              <div className="space-y-4">
                                {(ind.baseline.people || []).map((p, pIdx) => (
                                  <div key={p.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-3 relative">
                                    <div className="flex justify-between items-center">
                                      <input
                                        className="bg-transparent font-bold text-xs border-none focus:ring-0 w-full"
                                        value={p.name}
                                        onChange={(e) => updatePerson(idx, 'baseline', pIdx, 'name', e.target.value)}
                                      />
                                      <button onClick={() => removePerson(idx, pIdx)} className="text-slate-300 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">R$/Hora</label>
                                        <input type="number" className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 text-xs font-bold" value={p.hourlyRate} onChange={(e) => updatePerson(idx, 'baseline', pIdx, 'hourlyRate', parseFloat(e.target.value) || 0)} />
                                      </div>
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Minutos</label>
                                        <input type="number" className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 text-xs font-bold" value={p.minutesSpent} onChange={(e) => updatePerson(idx, 'baseline', pIdx, 'minutesSpent', parseFloat(e.target.value) || 0)} />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Frequência</label>
                                        <input type="number" className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 text-xs font-bold" value={p.frequencyQuantity} onChange={(e) => updatePerson(idx, 'baseline', pIdx, 'frequencyQuantity', parseFloat(e.target.value) || 0)} />
                                      </div>
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Unidade</label>
                                        <select className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 text-xs font-bold" value={p.frequencyUnit} onChange={(e) => updatePerson(idx, 'baseline', pIdx, 'frequencyUnit', e.target.value as FrequencyUnit)}>
                                          <option value={FrequencyUnit.HOUR}>Hora</option>
                                          <option value={FrequencyUnit.DAY}>Dia</option>
                                          <option value={FrequencyUnit.WEEK}>Semana</option>
                                          <option value={FrequencyUnit.MONTH}>Mês</option>
                                          <option value={FrequencyUnit.QUARTER}>Trimestre</option>
                                          <option value={FrequencyUnit.YEAR}>Ano</option>
                                        </select>
                                      </div>
                                    </div>
                                    {/*<div>
                                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Multiplicador Anual</label>
                                      <input
                                        type="number"
                                        className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 text-xs font-bold"
                                        value={getFrequencyMultiplier(p.frequencyUnit)}
                                        onChange={(e) => updateFrequencyMultiplier(p.frequencyUnit, parseFloat(e.target.value) || 1)}
                                      />
                                    </div>*/}
                                  </div>
                                ))}
                                {ind.improvement_type === ImprovementType.DECISION_QUALITY && (
                                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-3 mt-4">
                                    <div>
                                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Quantidade de Decisões/Mês</label>
                                      <input
                                        type="number"
                                        className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                        value={ind.baseline.decisionCount || 0}
                                        onChange={(e) => updateIndicatorData(idx, 'baseline', 'decisionCount', parseFloat(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Precisão das Decisões (%)</label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                        value={ind.baseline.accuracyPct || 0}
                                        onChange={(e) => updateIndicatorData(idx, 'baseline', 'accuracyPct', parseFloat(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Custo por Erro (R$)</label>
                                      <input
                                        type="number"
                                        className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                        value={ind.baseline.errorCost || 0}
                                        onChange={(e) => updateIndicatorData(idx, 'baseline', 'errorCost', parseFloat(e.target.value) || 0)}
                                      />
                                    </div>
                                  </div>
                                )}
                                <button onClick={() => addPerson(idx)} className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">+ Adicionar Novo Colaborador/Fluxo</button>
                              </div>
                            )}

                            {/* REVENUE_INCREASE */}
                            {ind.improvement_type === ImprovementType.REVENUE_INCREASE && (
                              <div className="space-y-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                                  <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Receita Mensal (R$)</label>
                                  <input
                                    type="number"
                                    className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                    value={ind.baseline.revenue || 0}
                                    onChange={(e) => updateIndicatorData(idx, 'baseline', 'revenue', parseFloat(e.target.value) || 0)}
                                  />
                                </div>
                              </div>
                            )}

                            {/* MARGIN_IMPROVEMENT */}
                            {ind.improvement_type === ImprovementType.MARGIN_IMPROVEMENT && (
                              <div className="space-y-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-3">
                                  <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Receita Mensal (R$)</label>
                                    <input
                                      type="number"
                                      className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                      value={ind.baseline.revenue || 0}
                                      onChange={(e) => updateIndicatorData(idx, 'baseline', 'revenue', parseFloat(e.target.value) || 0)}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Custo Mensal (R$)</label>
                                    <input
                                      type="number"
                                      className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                      value={ind.baseline.cost || 0}
                                      onChange={(e) => updateIndicatorData(idx, 'baseline', 'cost', parseFloat(e.target.value) || 0)}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* RISK_REDUCTION */}
                            {ind.improvement_type === ImprovementType.RISK_REDUCTION && (
                              <div className="space-y-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-3">
                                  <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Probabilidade do Risco (%)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                      value={ind.baseline.probability || 0}
                                      onChange={(e) => updateIndicatorData(idx, 'baseline', 'probability', parseFloat(e.target.value) || 0)}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Impacto Financeiro (R$)</label>
                                    <input
                                      type="number"
                                      className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                      value={ind.baseline.impact || 0}
                                      onChange={(e) => updateIndicatorData(idx, 'baseline', 'impact', parseFloat(e.target.value) || 0)}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Custo de Mitigação Mensal (R$)</label>
                                    <input
                                      type="number"
                                      className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                      value={ind.baseline.mitigationCost || 0}
                                      onChange={(e) => updateIndicatorData(idx, 'baseline', 'mitigationCost', parseFloat(e.target.value) || 0)}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* SATISFACTION */}
                            {ind.improvement_type === ImprovementType.SATISFACTION && (
                              <div className="space-y-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-3">
                                  <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Taxa de Churn (%)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                      value={ind.baseline.churnRate || 0}
                                      onChange={(e) => updateIndicatorData(idx, 'baseline', 'churnRate', parseFloat(e.target.value) || 0)}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Número de Clientes</label>
                                    <input
                                      type="number"
                                      className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                      value={ind.baseline.clientCount || 0}
                                      onChange={(e) => updateIndicatorData(idx, 'baseline', 'clientCount', parseFloat(e.target.value) || 0)}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Valor por Cliente (R$)</label>
                                    <input
                                      type="number"
                                      className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                      value={ind.baseline.valuePerClient || 0}
                                      onChange={(e) => updateIndicatorData(idx, 'baseline', 'valuePerClient', parseFloat(e.target.value) || 0)}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Score NPS/CSAT</label>
                                    <input
                                      type="number"
                                      className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                      value={ind.baseline.score || 0}
                                      onChange={(e) => updateIndicatorData(idx, 'baseline', 'score', parseFloat(e.target.value) || 0)}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Receita Adicional Mensal (R$)</label>
                                    <input
                                      type="number"
                                      className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                      value={ind.baseline.revenue || 0}
                                      onChange={(e) => updateIndicatorData(idx, 'baseline', 'revenue', parseFloat(e.target.value) || 0)}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* ANALYTICAL_CAPACITY */}
                            {ind.improvement_type === ImprovementType.ANALYTICAL_CAPACITY && (
                              <div className="space-y-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-3">
                                  <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Volume de Análises/Mês</label>
                                    <input
                                      type="number"
                                      className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                      value={ind.baseline.volume || 0}
                                      onChange={(e) => updateIndicatorData(idx, 'baseline', 'volume', parseFloat(e.target.value) || 0)}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Custo por Análise (R$)</label>
                                    <input
                                      type="number"
                                      className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                      value={ind.baseline.cost || 0}
                                      onChange={(e) => updateIndicatorData(idx, 'baseline', 'cost', parseFloat(e.target.value) || 0)}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* RELATED_COSTS */}
                            {ind.improvement_type === ImprovementType.RELATED_COSTS && (
                              <div className="space-y-4">
                                {getRelatedCosts(ind).map((cost, costIdx) => (
                                  <div key={cost.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-3 relative">
                                    <div className="flex justify-between items-center">
                                      <input
                                        className="bg-transparent font-bold text-xs border-none focus:ring-0 w-full"
                                        value={cost.name}
                                        onChange={(e) => updateRelatedCost(idx, costIdx, 'name', e.target.value)}
                                        placeholder="Nome do custo"
                                      />
                                      <button onClick={() => removeRelatedCost(idx, costIdx)} className="text-slate-300 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                    </div>
                                    <div>
                                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Valor (R$)</label>
                                      <input
                                        type="number"
                                        className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 text-xs font-bold"
                                        value={cost.cost}
                                        onChange={(e) => updateRelatedCost(idx, costIdx, 'cost', parseFloat(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Frequência</label>
                                        <input
                                          type="number"
                                          className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 text-xs font-bold"
                                          value={cost.frequencyQuantity}
                                          onChange={(e) => updateRelatedCost(idx, costIdx, 'frequencyQuantity', parseFloat(e.target.value) || 0)}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Unidade</label>
                                        <select
                                          className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 text-xs font-bold"
                                          value={cost.frequencyUnit}
                                          onChange={(e) => updateRelatedCost(idx, costIdx, 'frequencyUnit', e.target.value as FrequencyUnit)}
                                        >
                                          <option value={FrequencyUnit.HOUR}>Hora</option>
                                          <option value={FrequencyUnit.DAY}>Dia</option>
                                          <option value={FrequencyUnit.WEEK}>Semana</option>
                                          <option value={FrequencyUnit.MONTH}>Mês</option>
                                          <option value={FrequencyUnit.QUARTER}>Trimestre</option>
                                          <option value={FrequencyUnit.YEAR}>Ano</option>
                                        </select>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                      <input
                                        type="checkbox"
                                        id={`ia-cost-${cost.id}`}
                                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                                        checked={cost.isIACost || false}
                                        onChange={(e) => updateRelatedCost(idx, costIdx, 'isIACost', e.target.checked)}
                                      />
                                      <label htmlFor={`ia-cost-${cost.id}`} className="text-[9px] uppercase font-bold text-slate-400 cursor-pointer">
                                        Custo com IA
                                      </label>
                                    </div>
                                  </div>
                                ))}
                                <button onClick={() => addRelatedCost(idx)} className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">+ Adicionar Novo Custo</button>
                              </div>
                            )}

                            {/* OTHER */}
                            {ind.improvement_type === ImprovementType.OTHER && (
                              <div className="space-y-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                                  <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Valor Mensal (R$)</label>
                                  <input
                                    type="number"
                                    className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                    value={ind.baseline.value || 0}
                                    onChange={(e) => updateIndicatorData(idx, 'baseline', 'value', parseFloat(e.target.value) || 0)}
                                  />
                                </div>
                              </div>
                            )}

                            {/* CUSTOM */}
                            {ind.improvement_type === ImprovementType.CUSTOM && (
                              <div className="space-y-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-3">
                                  <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Valor Baseline</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                      value={ind.baseline.customValue || ''}
                                      onChange={(e) => updateIndicatorData(idx, 'baseline', 'customValue', parseFloat(e.target.value) || 0)}
                                      placeholder="0.00"
                                    />
                                  </div>

                                  {/* Direção do Indicador */}
                                  <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Direção do Indicador</label>
                                    <select
                                      className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                      value={ind.baseline.customConfig?.direction || 'decrease'}
                                      onChange={async (e) => {
                                        const newDirection = e.target.value as 'increase' | 'decrease';
                                        const newArr = [...indicators];
                                        const currentConfig = newArr[idx].baseline.customConfig || {
                                          direction: 'decrease',
                                          unitType: 'quantity',
                                          hasFinancialImpact: false
                                        };
                                        newArr[idx] = {
                                          ...newArr[idx],
                                          baseline: {
                                            ...newArr[idx].baseline,
                                            customConfig: { ...currentConfig, direction: newDirection }
                                          }
                                        };
                                        setIndicators(newArr);
                                        await saveIndicator(newArr[idx]);
                                      }}
                                    >
                                      <option value="increase">Aumento Desejado</option>
                                      <option value="decrease">Redução Desejada</option>
                                    </select>
                                  </div>

                                  {/* Tipo de Unidade */}
                                  <div>
                                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Tipo de Unidade</label>
                                    <select
                                      className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                      value={ind.baseline.customConfig?.unitType || 'quantity'}
                                      onChange={async (e) => {
                                        const newUnitType = e.target.value as 'percentage' | 'currency' | 'time' | 'quantity' | 'custom';
                                        const newArr = [...indicators];
                                        const currentConfig = newArr[idx].baseline.customConfig || {
                                          direction: 'decrease',
                                          unitType: 'quantity',
                                          hasFinancialImpact: false
                                        };
                                        newArr[idx] = {
                                          ...newArr[idx],
                                          baseline: {
                                            ...newArr[idx].baseline,
                                            customConfig: { ...currentConfig, unitType: newUnitType }
                                          }
                                        };
                                        setIndicators(newArr);
                                        await saveIndicator(newArr[idx]);
                                      }}
                                    >
                                      <option value="percentage">Porcentagem (%)</option>
                                      <option value="currency">Moeda (R$)</option>
                                      <option value="time">Tempo</option>
                                      <option value="quantity">Quantidade</option>
                                      <option value="custom">Personalizada</option>
                                    </select>
                                  </div>

                                  {/* Nome da Unidade (quando for Personalizada) */}
                                  {ind.baseline.customConfig?.unitType === 'custom' && (
                                    <div>
                                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Nome da Unidade</label>
                                      <input
                                        type="text"
                                        className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                        value={ind.baseline.customConfig?.unitLabel || ''}
                                        onChange={async (e) => {
                                          const newUnitLabel = e.target.value;
                                          const newArr = [...indicators];
                                          const currentConfig = newArr[idx].baseline.customConfig || {
                                            direction: 'decrease',
                                            unitType: 'custom',
                                            hasFinancialImpact: false
                                          };
                                          newArr[idx] = {
                                            ...newArr[idx],
                                            baseline: {
                                              ...newArr[idx].baseline,
                                              customConfig: { ...currentConfig, unitLabel: newUnitLabel }
                                            }
                                          };
                                          setIndicators(newArr);
                                          await saveIndicator(newArr[idx]);
                                        }}
                                        placeholder="ex: tickets, leads, processos"
                                      />
                                    </div>
                                  )}

                                  {/* Checkbox: Impacto Financeiro */}
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                                      checked={ind.baseline.customConfig?.hasFinancialImpact || false}
                                      onChange={async (e) => {
                                        const hasImpact = e.target.checked;
                                        const newArr = [...indicators];
                                        const currentConfig = newArr[idx].baseline.customConfig || {
                                          direction: 'decrease',
                                          unitType: 'quantity',
                                          hasFinancialImpact: false
                                        };
                                        newArr[idx] = {
                                          ...newArr[idx],
                                          baseline: {
                                            ...newArr[idx].baseline,
                                            customConfig: {
                                              ...currentConfig,
                                              hasFinancialImpact: hasImpact,
                                              unitCost: hasImpact ? (currentConfig.unitCost || 0) : undefined,
                                              volume: hasImpact ? (currentConfig.volume || 0) : undefined
                                            }
                                          }
                                        };
                                        setIndicators(newArr);
                                        await saveIndicator(newArr[idx]);
                                      }}
                                    />
                                    <label className="text-[9px] uppercase font-bold text-slate-400">Este indicador gera impacto financeiro</label>
                                  </div>

                                  {/* Campos de Impacto Financeiro */}
                                  {ind.baseline.customConfig?.hasFinancialImpact && (
                                    <>
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Custo por Unidade (R$)</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                          value={ind.baseline.customConfig?.unitCost || ''}
                                          onChange={async (e) => {
                                            const newUnitCost = parseFloat(e.target.value) || 0;
                                            const newArr = [...indicators];
                                            const currentConfig = newArr[idx].baseline.customConfig || {
                                              direction: 'decrease',
                                              unitType: 'quantity',
                                              hasFinancialImpact: true
                                            };
                                            newArr[idx] = {
                                              ...newArr[idx],
                                              baseline: {
                                                ...newArr[idx].baseline,
                                                customConfig: { ...currentConfig, unitCost: newUnitCost }
                                              }
                                            };
                                            setIndicators(newArr);
                                            await saveIndicator(newArr[idx]);
                                          }}
                                          placeholder="0.00"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-slate-400 block mb-2">Volume</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                          value={ind.baseline.customConfig?.volume || ''}
                                          onChange={async (e) => {
                                            const newVolume = parseFloat(e.target.value) || 0;
                                            const newArr = [...indicators];
                                            const currentConfig = newArr[idx].baseline.customConfig || {
                                              direction: 'decrease',
                                              unitType: 'quantity',
                                              hasFinancialImpact: true
                                            };
                                            newArr[idx] = {
                                              ...newArr[idx],
                                              baseline: {
                                                ...newArr[idx].baseline,
                                                customConfig: { ...currentConfig, volume: newVolume }
                                              }
                                            };
                                            setIndicators(newArr);
                                            await saveIndicator(newArr[idx]);
                                          }}
                                          placeholder="0.00"
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Post-IA Section */}
                          <div className="space-y-6">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                              <h4 className="text-sm font-black uppercase text-indigo-500 tracking-widest">Estado Desejado (Pós-IA)</h4>
                            </div>

                            {/* RELATED_COSTS Post-IA */}
                            {ind.improvement_type === ImprovementType.RELATED_COSTS && (
                              <div className="space-y-4">
                                {getRelatedCostsPostIA(ind).map((cost, costIdx) => (
                                  <div key={cost.id} className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 space-y-3 relative">
                                    <div className="flex justify-between items-center">
                                      <input
                                        className="bg-transparent font-bold text-xs border-none focus:ring-0 w-full text-indigo-900 dark:text-indigo-200"
                                        value={cost.name}
                                        onChange={(e) => updateRelatedCostPostIA(idx, costIdx, 'name', e.target.value)}
                                        placeholder="Nome do custo pós-IA"
                                      />
                                      <button onClick={() => removeRelatedCostPostIA(idx, costIdx)} className="text-indigo-300 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                    </div>
                                    <div>
                                      <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-1">Valor (R$)</label>
                                      <input
                                        type="number"
                                        className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={cost.cost}
                                        onChange={(e) => updateRelatedCostPostIA(idx, costIdx, 'cost', parseFloat(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-1">Frequência</label>
                                        <input
                                          type="number"
                                          className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                          value={cost.frequencyQuantity}
                                          onChange={(e) => updateRelatedCostPostIA(idx, costIdx, 'frequencyQuantity', parseFloat(e.target.value) || 0)}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-1">Unidade</label>
                                        <select
                                          className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                          value={cost.frequencyUnit}
                                          onChange={(e) => updateRelatedCostPostIA(idx, costIdx, 'frequencyUnit', e.target.value as FrequencyUnit)}
                                        >
                                          <option value={FrequencyUnit.HOUR}>Hora</option>
                                          <option value={FrequencyUnit.DAY}>Dia</option>
                                          <option value={FrequencyUnit.WEEK}>Semana</option>
                                          <option value={FrequencyUnit.MONTH}>Mês</option>
                                          <option value={FrequencyUnit.QUARTER}>Trimestre</option>
                                          <option value={FrequencyUnit.YEAR}>Ano</option>
                                        </select>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2 border-t border-indigo-200 dark:border-indigo-800">
                                      <input
                                        type="checkbox"
                                        id={`ia-cost-post-${cost.id}`}
                                        className="w-4 h-4 rounded border-indigo-300 dark:border-indigo-600 text-indigo-600 focus:ring-indigo-500"
                                        checked={cost.isIACost || false}
                                        onChange={(e) => updateRelatedCostPostIA(idx, costIdx, 'isIACost', e.target.checked)}
                                      />
                                      <label htmlFor={`ia-cost-post-${cost.id}`} className="text-[9px] uppercase font-bold text-indigo-400 cursor-pointer">
                                        Custo com IA
                                      </label>
                                    </div>
                                  </div>
                                ))}
                                <button onClick={() => addRelatedCostPostIA(idx)} className="w-full py-3 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-xl text-[10px] font-bold text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">+ Adicionar Novo Custo Pós-IA</button>
                              </div>
                            )}

                            {ind.improvement_type !== ImprovementType.RELATED_COSTS && (
                              <>

                                {(ind.improvement_type === ImprovementType.PRODUCTIVITY || ind.improvement_type === ImprovementType.SPEED || ind.improvement_type === ImprovementType.DECISION_QUALITY) && (
                                  <div className="space-y-4">
                                    {(ind.postIA.people || []).map((p, pIdx) => (
                                      <div key={p.id} className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 space-y-3 relative">
                                        <div className="flex justify-between items-center">
                                          <input
                                            className="bg-transparent font-bold text-xs border-none focus:ring-0 w-full text-indigo-900 dark:text-indigo-200"
                                            value={p.name}
                                            onChange={(e) => updatePerson(idx, 'postIA', pIdx, 'name', e.target.value)}
                                          />
                                          <span className="text-[10px] font-black text-green-500">
                                            {((ind.baseline.people?.[pIdx]?.minutesSpent || 0) > p.minutesSpent) ? `-${(((ind.baseline.people?.[pIdx]?.minutesSpent || 0) - p.minutesSpent) / (ind.baseline.people?.[pIdx]?.minutesSpent || 1) * 100).toFixed(0)}% tempo` : ''}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-1">R$/Hora</label>
                                            <input
                                              type="number"
                                              className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                              value={p.hourlyRate}
                                              onChange={(e) => updatePerson(idx, 'postIA', pIdx, 'hourlyRate', parseFloat(e.target.value) || 0)}
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-1">Minutos (IA)</label>
                                            <input
                                              type="number"
                                              className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-indigo-200 dark:border-indigo-800 text-xs font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                              value={p.minutesSpent}
                                              onChange={(e) => updatePerson(idx, 'postIA', pIdx, 'minutesSpent', parseFloat(e.target.value) || 0)}
                                            />
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-1">Frequência</label>
                                            <input
                                              type="number"
                                              className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                              value={p.frequencyQuantity}
                                              onChange={(e) => updatePerson(idx, 'postIA', pIdx, 'frequencyQuantity', parseFloat(e.target.value) || 0)}
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-1">Unidade</label>
                                            <select className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none" value={p.frequencyUnit} onChange={(e) => updatePerson(idx, 'postIA', pIdx, 'frequencyUnit', e.target.value as FrequencyUnit)}>
                                              <option value={FrequencyUnit.HOUR}>Hora</option>
                                              <option value={FrequencyUnit.DAY}>Dia</option>
                                              <option value={FrequencyUnit.WEEK}>Semana</option>
                                              <option value={FrequencyUnit.MONTH}>Mês</option>
                                              <option value={FrequencyUnit.QUARTER}>Trimestre</option>
                                              <option value={FrequencyUnit.YEAR}>Ano</option>
                                            </select>
                                          </div>
                                        </div>
                                        {/*<div>
                                      <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-1">Multiplicador Anual</label>
                                      <input
                                        type="number"
                                        className="w-full bg-white dark:bg-slate-800 p-2 rounded border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={getFrequencyMultiplier(p.frequencyUnit)}
                                        onChange={(e) => updateFrequencyMultiplier(p.frequencyUnit, parseFloat(e.target.value) || 1)}
                                      />
                                    </div>*/}
                                      </div>
                                    ))}
                                    {ind.improvement_type === ImprovementType.DECISION_QUALITY && (
                                      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 space-y-3 mt-4">
                                        <div>
                                          <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-2">Quantidade de Decisões/Mês com IA</label>
                                          <input
                                            type="number"
                                            className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-indigo-200 dark:border-indigo-800 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={ind.postIA.decisionCount || 0}
                                            onChange={(e) => updateIndicatorData(idx, 'postIA', 'decisionCount', parseFloat(e.target.value) || 0)}
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-2">Precisão das Decisões com IA (%)</label>
                                          <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-indigo-200 dark:border-indigo-800 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={ind.postIA.accuracyPct || 0}
                                            onChange={(e) => updateIndicatorData(idx, 'postIA', 'accuracyPct', parseFloat(e.target.value) || 0)}
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-2">Custo por Erro com IA (R$)</label>
                                          <input
                                            type="number"
                                            className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-indigo-200 dark:border-indigo-800 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={ind.postIA.errorCost || 0}
                                            onChange={(e) => updateIndicatorData(idx, 'postIA', 'errorCost', parseFloat(e.target.value) || 0)}
                                          />
                                        </div>
                                        {ind.baseline.accuracyPct && ind.postIA.accuracyPct && (
                                          <p className="text-[10px] font-black text-green-500 mt-2">
                                            Melhoria na Precisão: +{((ind.postIA.accuracyPct - ind.baseline.accuracyPct) / ind.baseline.accuracyPct * 100).toFixed(1)}%
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* REVENUE_INCREASE Post-IA */}
                                {ind.improvement_type === ImprovementType.REVENUE_INCREASE && (
                                  <div className="space-y-4">
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                      <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-2">Receita Mensal com IA (R$)</label>
                                      <input
                                        type="number"
                                        className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-indigo-200 dark:border-indigo-800 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={ind.postIA.revenue || 0}
                                        onChange={(e) => updateIndicatorData(idx, 'postIA', 'revenue', parseFloat(e.target.value) || 0)}
                                      />
                                      {ind.baseline.revenue && ind.postIA.revenue && (
                                        <p className="text-[10px] font-black text-green-500 mt-2">
                                          +{(((ind.postIA.revenue - ind.baseline.revenue) / ind.baseline.revenue) * 100).toFixed(1)}% receita
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* MARGIN_IMPROVEMENT Post-IA */}
                                {ind.improvement_type === ImprovementType.MARGIN_IMPROVEMENT && (
                                  <div className="space-y-4">
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border-indigo-100 dark:border-indigo-900/30 space-y-3">
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-2">Receita Mensal com IA (R$)</label>
                                        <input
                                          type="number"
                                          className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-indigo-200 dark:border-indigo-800 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                          value={ind.postIA.revenue || 0}
                                          onChange={(e) => updateIndicatorData(idx, 'postIA', 'revenue', parseFloat(e.target.value) || 0)}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-2">Custo Mensal com IA (R$)</label>
                                        <input
                                          type="number"
                                          className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-indigo-200 dark:border-indigo-800 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                          value={ind.postIA.cost || 0}
                                          onChange={(e) => updateIndicatorData(idx, 'postIA', 'cost', parseFloat(e.target.value) || 0)}
                                        />
                                      </div>
                                      {ind.baseline.revenue && ind.baseline.cost && ind.postIA.revenue && ind.postIA.cost && (
                                        <p className="text-[10px] font-black text-green-500 mt-2">
                                          Margem: R$ {((ind.postIA.revenue - ind.postIA.cost) - (ind.baseline.revenue - ind.baseline.cost)).toLocaleString()}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* RISK_REDUCTION Post-IA */}
                                {ind.improvement_type === ImprovementType.RISK_REDUCTION && (
                                  <div className="space-y-4">
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 space-y-3">
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-2">Probabilidade do Risco com IA (%)</label>
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-indigo-200 dark:border-indigo-800 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                          value={ind.postIA.probability || 0}
                                          onChange={(e) => updateIndicatorData(idx, 'postIA', 'probability', parseFloat(e.target.value) || 0)}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-2">Impacto Financeiro com IA (R$)</label>
                                        <input
                                          type="number"
                                          className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-indigo-200 dark:border-indigo-800 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                          value={ind.postIA.impact || 0}
                                          onChange={(e) => updateIndicatorData(idx, 'postIA', 'impact', parseFloat(e.target.value) || 0)}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-2">Custo de Mitigação Mensal com IA (R$)</label>
                                        <input
                                          type="number"
                                          className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-indigo-200 dark:border-indigo-800 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                          value={ind.postIA.mitigationCost || 0}
                                          onChange={(e) => updateIndicatorData(idx, 'postIA', 'mitigationCost', parseFloat(e.target.value) || 0)}
                                        />
                                      </div>
                                      {ind.baseline.probability && ind.baseline.impact && ind.postIA.probability && ind.postIA.impact && (
                                        <p className="text-[10px] font-black text-green-500 mt-2">
                                          Redução de Risco: {((((ind.baseline.probability / 100) * ind.baseline.impact) - ((ind.postIA.probability || 0) / 100 * (ind.postIA.impact || 0))) / ((ind.baseline.probability / 100) * ind.baseline.impact) * 100).toFixed(1)}%
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* SATISFACTION Post-IA */}
                                {ind.improvement_type === ImprovementType.SATISFACTION && (
                                  <div className="space-y-4">
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 space-y-3">
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-2">Taxa de Churn com IA (%)</label>
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-indigo-200 dark:border-indigo-800 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                          value={ind.postIA.churnRate || 0}
                                          onChange={(e) => updateIndicatorData(idx, 'postIA', 'churnRate', parseFloat(e.target.value) || 0)}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-2">Número de Clientes com IA</label>
                                        <input
                                          type="number"
                                          className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-indigo-200 dark:border-indigo-800 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                          value={ind.postIA.clientCount || 0}
                                          onChange={(e) => updateIndicatorData(idx, 'postIA', 'clientCount', parseFloat(e.target.value) || 0)}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-2">Valor por Cliente com IA (R$)</label>
                                        <input
                                          type="number"
                                          className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-indigo-200 dark:border-indigo-800 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                          value={ind.postIA.valuePerClient || 0}
                                          onChange={(e) => updateIndicatorData(idx, 'postIA', 'valuePerClient', parseFloat(e.target.value) || 0)}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-2">Score NPS/CSAT com IA</label>
                                        <input
                                          type="number"
                                          className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-indigo-200 dark:border-indigo-800 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                          value={ind.postIA.score || 0}
                                          onChange={(e) => updateIndicatorData(idx, 'postIA', 'score', parseFloat(e.target.value) || 0)}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-2">Receita Adicional Mensal com IA (R$)</label>
                                        <input
                                          type="number"
                                          className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-indigo-200 dark:border-indigo-800 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                          value={ind.postIA.revenue || 0}
                                          onChange={(e) => updateIndicatorData(idx, 'postIA', 'revenue', parseFloat(e.target.value) || 0)}
                                        />
                                      </div>
                                      {ind.baseline.score && ind.postIA.score && (
                                        <p className="text-[10px] font-black text-green-500 mt-2">
                                          Melhoria no Score: +{((ind.postIA.score - ind.baseline.score) / ind.baseline.score * 100).toFixed(1)}%
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* ANALYTICAL_CAPACITY Post-IA */}
                                {ind.improvement_type === ImprovementType.ANALYTICAL_CAPACITY && (
                                  <div className="space-y-4">
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 space-y-3">
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-2">Volume de Análises/Mês com IA</label>
                                        <input
                                          required={true}
                                          type="number"
                                          className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-indigo-200 dark:border-indigo-800 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                          value={ind.postIA.volume || 0}
                                          onChange={(e) => updateIndicatorData(idx, 'postIA', 'volume', parseFloat(e.target.value) || 0)}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-2">Custo por Análise com IA (R$)</label>
                                        <input
                                          type="number"
                                          className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-indigo-200 dark:border-indigo-800 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                          value={ind.postIA.cost || 0}
                                          onChange={(e) => updateIndicatorData(idx, 'postIA', 'cost', parseFloat(e.target.value) || 0)}
                                        />
                                      </div>
                                      {ind.baseline.volume && ind.baseline.cost && ind.postIA.volume && ind.postIA.cost && (
                                        <p className="text-[10px] font-black text-green-500 mt-2">
                                          Economia: R$ {((ind.baseline.volume * ind.baseline.cost) - (ind.postIA.volume * ind.postIA.cost)).toLocaleString()}/mês
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}


                                {/* OTHER Post-IA */}
                                {ind.improvement_type === ImprovementType.OTHER && (
                                  <div className="space-y-4">
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                      <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-2">Valor Mensal com IA (R$)</label>
                                      <input
                                        type="number"
                                        className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-indigo-200 dark:border-indigo-800 text-sm font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={ind.postIA.value || 0}
                                        onChange={(e) => updateIndicatorData(idx, 'postIA', 'value', parseFloat(e.target.value) || 0)}
                                      />
                                      {ind.baseline.value && ind.postIA.value && (
                                        <p className="text-[10px] font-black text-green-500 mt-2">
                                          Ganho: R$ {(ind.postIA.value - ind.baseline.value).toLocaleString()}/mês
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* CUSTOM Post-IA */}
                                {ind.improvement_type === ImprovementType.CUSTOM && (
                                  <div className="space-y-4">
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 space-y-3">
                                      <div>
                                        <label className="text-[9px] uppercase font-bold text-indigo-400 block mb-2">Valor Pós-IA</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="w-full bg-white dark:bg-slate-800 p-3 rounded border border-indigo-200 dark:border-indigo-800 text-sm font-bold text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                          value={ind.postIA.customValue || ''}
                                          onChange={(e) => updateIndicatorData(idx, 'postIA', 'customValue', parseFloat(e.target.value) || 0)}
                                          placeholder="0.00"
                                        />
                                      </div>

                                      {/* Preview da diferença calculada */}
                                      {(() => {
                                        const baselineValue = ind.baseline.customValue || 0;
                                        const postIAValue = ind.postIA.customValue || 0;
                                        const customConfig = ind.baseline.customConfig || {
                                          direction: 'decrease',
                                          unitType: 'quantity',
                                          hasFinancialImpact: false
                                        };

                                        if (baselineValue && postIAValue) {
                                          // Calcular melhoria percentual
                                          const improvement = calculateCustomImprovement(baselineValue, postIAValue, customConfig.direction);

                                          // Calcular diferença absoluta
                                          const diff = customConfig.direction === 'decrease'
                                            ? baselineValue - postIAValue
                                            : postIAValue - baselineValue;

                                          // Determinar unidade de exibição
                                          const displayUnit = customConfig.unitType === 'currency'
                                            ? 'R$'
                                            : customConfig.unitType === 'percentage'
                                              ? '%'
                                              : customConfig.unitType === 'time'
                                                ? 'horas'
                                                : customConfig.unitType === 'quantity'
                                                  ? 'unidades'
                                                  : customConfig.unitLabel || '';

                                          // Calcular impacto financeiro se aplicável
                                          let financialImpact = null;
                                          if (customConfig.hasFinancialImpact && customConfig.unitCost && customConfig.volume) {
                                            const financialDiff = diff * customConfig.volume * customConfig.unitCost;
                                            financialImpact = financialDiff;
                                          }

                                          return (
                                            <div className="pt-3 border-t border-indigo-200 dark:border-indigo-800 space-y-2">
                                              <div>
                                                <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Melhoria</p>
                                                <p className={`text-lg font-black ${improvement >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                  {improvement >= 0 ? '+' : ''}{improvement.toFixed(1)}%
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Diferença</p>
                                                <p className={`text-lg font-black ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                  {diff >= 0 ? '+' : ''}
                                                  {customConfig.unitType === 'percentage'
                                                    ? `${diff.toFixed(1)}${displayUnit}`
                                                    : customConfig.unitType === 'currency'
                                                      ? `${diff.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${displayUnit}`
                                                      : `${diff.toFixed(2)} ${displayUnit}`
                                                  }
                                                </p>
                                              </div>
                                              {financialImpact !== null && (
                                                <div>
                                                  <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Impacto Financeiro</p>
                                                  <p className={`text-lg font-black ${financialImpact >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    R$ {financialImpact.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mês
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="bg-slate-950 p-6 flex justify-between items-center text-white">
                          <div className="flex gap-12">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black uppercase text-slate-500">Melhoria Estimada</span>
                              <span className={`text-xl font-black ${parseFloat(stats.improvementPct || '0') >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {(() => {
                                  const pct = parseFloat(stats.improvementPct || '0');
                                  if (isNaN(pct)) return '0%';
                                  // Melhoria sempre positiva quando há redução de custo
                                  return `${Math.abs(pct).toFixed(1)}%`;
                                })()}
                              </span>
                            </div>
                            {ind.improvement_type !== ImprovementType.CUSTOM && (
                              <div className="flex flex-col border-l border-slate-800 pl-12">
                                <span className="text-[9px] font-black uppercase text-slate-500">Economia Mensal</span>
                                <span className={`text-xl font-black ${parseFloat((stats as any).economyValue !== undefined ? (stats as any).economyValue : stats.monthlyEconomy || '0') >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {(() => {
                                    const economyValue = (stats as any).economyValue !== undefined
                                      ? (stats as any).economyValue
                                      : parseFloat(stats.monthlyEconomy || '0');
                                    const economyUnit = (stats as any).economyUnit || 'R$/mês';

                                    if (isNaN(economyValue)) {
                                      if (economyUnit === '%') return '0%';
                                      if (economyUnit === 'horas' || economyUnit === 'horas/mês') return '0 horas';
                                      if (economyUnit === 'R$' || economyUnit.includes('R$')) return 'R$ 0,00';
                                      return `0 ${economyUnit}`;
                                    }

                                    // Formatar baseado na unidade
                                    if (economyUnit === '%') {
                                      return `${economyValue >= 0 ? '+' : ''}${economyValue.toFixed(1)}%`;
                                    } else if (economyUnit === 'horas' || economyUnit === 'horas/mês') {
                                      return `${economyValue >= 0 ? '+' : ''}${economyValue.toFixed(1)} horas`;
                                    } else if (economyUnit === 'R$' || economyUnit.includes('R$')) {
                                      return `${economyValue >= 0 ? '+' : ''}R$ ${economyValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                    } else {
                                      // Unidade personalizada
                                      return `${economyValue >= 0 ? '+' : ''}${economyValue.toFixed(2)} ${economyUnit}`;
                                    }
                                  })()}
                                </span>
                              </div>
                            )}
                            {ind.improvement_type === ImprovementType.SPEED && stats.monthlyTimeSaved && parseFloat(stats.monthlyTimeSaved) > 0 && (
                              <div className="flex flex-col border-l border-slate-800 pl-12">
                                <span className="text-[9px] font-black uppercase text-slate-500">Tempo Economizado</span>
                                <span className="text-xl font-black text-blue-400">{parseFloat(stats.monthlyTimeSaved || '0').toFixed(1)}h/mês</span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-black uppercase text-slate-500 block">Confidência do ROI</span>
                            <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black border border-green-500/30">ALTA</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
                <h3 className="text-xl font-bold">Informações Estruturais</h3>

                {/* Informações Gerais */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black uppercase text-indigo-500 tracking-widest border-b border-slate-50 dark:border-slate-800 pb-2">Informações Gerais</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Nome do Projeto</label>
                      <input
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        value={project.name || ''}
                        onChange={async (e) => {
                          const newName = e.target.value;
                          setProject({ ...project, name: newName });
                          await saveProject({ name: newName });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Patrocinador (Sponsor)</label>
                      <input
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        value={project.sponsor || ''}
                        onChange={async (e) => {
                          const newSponsor = e.target.value;
                          setProject({ ...project, sponsor: newSponsor });
                          await saveProject({ sponsor: newSponsor });
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Descrição da Iniciativa</label>
                    <textarea
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-32"
                      value={project.description || ''}
                      onChange={async (e) => {
                        const newDescription = e.target.value;
                        setProject({ ...project, description: newDescription });
                        await saveProject({ description: newDescription });
                      }}
                      placeholder="Descreva brevemente o objetivo do projeto e o problema que ele resolve..."
                    />
                  </div>
                </div>

                {/* Categorização */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black uppercase text-indigo-500 tracking-widest border-b border-slate-50 dark:border-slate-800 pb-2">Categorização</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Área de Negócio</label>
                      <input
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        value={project.business_area || ''}
                        onChange={async (e) => {
                          const newBusinessArea = e.target.value;
                          setProject({ ...project, business_area: newBusinessArea });
                          await saveProject({ business_area: newBusinessArea });
                        }}
                        placeholder="Ex: CX, Jurídico, RH..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Tipo de Desenvolvimento</label>
                      <select
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                        value={project.development_type}
                        onChange={async (e) => {
                          const newDevelopmentType = e.target.value as DevelopmentType;
                          setProject({ ...project, development_type: newDevelopmentType });
                          await saveProject({ development_type: newDevelopmentType });
                        }}
                      >
                        {Object.entries(DEVELOPMENT_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Status</label>
                      <select
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                        value={project.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value as ProjectStatus;
                          setProject({ ...project, status: newStatus });
                          await saveProject({ status: newStatus });
                        }}
                      >
                        <option value={ProjectStatus.PLANNING}>Planejamento</option>
                        <option value={ProjectStatus.DEVELOPMENT}>Desenvolvimento</option>
                        <option value={ProjectStatus.TESTING}>Testes</option>
                        <option value={ProjectStatus.PRODUCTION}>Produção</option>
                        <option value={ProjectStatus.ON_HOLD}>Em Espera</option>
                        <option value={ProjectStatus.COMPLETED}>Concluído</option>
                        <option value={ProjectStatus.CANCELLED}>Cancelado</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Datas */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black uppercase text-indigo-500 tracking-widest border-b border-slate-50 dark:border-slate-800 pb-2">Datas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Data de Início</label>
                      <input
                        type="date"
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        value={project.start_date ? project.start_date.split('T')[0] : ''}
                        onChange={async (e) => {
                          const newStartDate = e.target.value;
                          setProject({ ...project, start_date: newStartDate });
                          await saveProject({ start_date: newStartDate });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Data de Go Live</label>
                      <input
                        type="date"
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        value={project.go_live_date ? project.go_live_date.split('T')[0] : ''}
                        onChange={async (e) => {
                          const newGoLiveDate = e.target.value || undefined;
                          setProject({ ...project, go_live_date: newGoLiveDate });
                          await saveProject({ go_live_date: newGoLiveDate });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Data de Fim</label>
                      <input
                        type="date"
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        value={project.end_date ? project.end_date.split('T')[0] : ''}
                        onChange={async (e) => {
                          const newEndDate = e.target.value || undefined;
                          setProject({ ...project, end_date: newEndDate });
                          await saveProject({ end_date: newEndDate });
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Financeiro */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black uppercase text-indigo-500 tracking-widest border-b border-slate-50 dark:border-slate-800 pb-2">Financeiro Estimado</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">CAPEX (Investimento Inicial R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        value={project.implementation_cost || ''}
                        onChange={async (e) => {
                          const newCost = parseFloat(e.target.value) || 0;
                          const updatedProject = { ...project, implementation_cost: newCost };
                          setProject(updatedProject);
                          await saveProject({ implementation_cost: newCost }, updatedProject);
                        }}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">OPEX (Manutenção Mensal R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        value={project.monthly_maintenance_cost || ''}
                        onChange={async (e) => {
                          const newCost = parseFloat(e.target.value) || 0;
                          const updatedProject = { ...project, monthly_maintenance_cost: newCost };
                          setProject(updatedProject);
                          await saveProject({ monthly_maintenance_cost: newCost }, updatedProject);
                        }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProjectDetail;

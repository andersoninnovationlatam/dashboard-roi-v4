# Business Logic - ROI Analytics Pro

## Visão Geral

Este documento descreve a lógica de negócio central da aplicação: como os cálculos de ROI são realizados, as fórmulas utilizadas, e os diferentes tipos de métricas de melhoria suportados.

## Modelo de Dados (Fonte de Verdade)

O arquivo `types.ts` é a fonte de verdade para todas as estruturas de dados da aplicação. Qualquer alteração em métricas ou tipos deve começar aqui.

### Tipos de Projeto (DevelopmentType)

```typescript
enum DevelopmentType {
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
```

### Status de Projeto (ProjectStatus)

```typescript
enum ProjectStatus {
  PLANNING = 'planning',
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  PRODUCTION = 'production',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}
```

### Tipos de Melhoria (ImprovementType)

```typescript
enum ImprovementType {
  PRODUCTIVITY = 'productivity',
  REVENUE_INCREASE = 'revenue_increase',
  MARGIN_IMPROVEMENT = 'margin_improvement',
  ANALYTICAL_CAPACITY = 'analytical_capacity',
  RISK_REDUCTION = 'risk_reduction',
  DECISION_QUALITY = 'decision_quality',
  SPEED = 'speed',
  SATISFACTION = 'satisfaction',
  RELATED_COSTS = 'related_costs',
  OTHER = 'other'
}
```

### Estrutura de Indicador

Um `Indicator` compara dois estados:
- **Baseline**: Como era antes da implementação da IA
- **PostIA**: Como ficou depois da implementação da IA

```typescript
interface Indicator {
  id: string;
  project_id: string;
  name: string;
  description: string;
  improvement_type: ImprovementType;
  baseline: IndicatorData;
  postIA: IndicatorData;
  is_active: boolean;
}
```

### Dados do Indicador (IndicatorData)

Os dados variam conforme o tipo de melhoria:

```typescript
interface IndicatorData {
  // Pessoas envolvidas (horas × taxa × frequência)
  people?: PersonInvolved[];
  
  // Ferramentas/softwares (custos mensais)
  tools?: ToolCost[];
  
  // Valores genéricos
  value?: number;
  revenue?: number;
  cost?: number;
  marginPct?: number;
  volume?: number;
  
  // Risco
  probability?: number;
  impact?: number;
  mitigationCost?: number;
  
  // Decisão
  decisionCount?: number;
  accuracyPct?: number;
  errorCost?: number;
  decisionTime?: number;
  
  // Velocidade
  deliveryTime?: number;
  deliveryCount?: number;
  delayCost?: number;
  
  // Satisfação
  score?: number; // NPS/CSAT
  clientCount?: number;
  valuePerClient?: number;
  churnRate?: number;
  
  // Custos relacionados
  implementationCost?: number;
}
```

## Cálculos por Tipo de Melhoria

### 1. PRODUCTIVITY / SPEED / DECISION_QUALITY

**Conceito**: Redução de tempo ou melhoria na qualidade de decisões.

**Fórmula**:
```
Custo Baseline = Σ(Pessoas) + Σ(Ferramentas) + Custos Diretos
Custo Pós-IA = Σ(Pessoas) + Σ(Ferramentas) + Custos Diretos
Economia Mensal = Custo Baseline - Custo Pós-IA
```

**Cálculo de Pessoas**:
```typescript
Custo Pessoa = (Taxa Horária × Minutos Gastos / 60) × Frequência Mensal
```

**Conversão de Frequência**:
- HOUR → Mensal: `quantidade × 24 × 30` (aproximação)
- DAY → Mensal: `quantidade × 30`
- WEEK → Mensal: `quantidade × 4.33`
- MONTH → Mensal: `quantidade × 1`
- QUARTER → Mensal: `quantidade / 3`
- YEAR → Mensal: `quantidade / 12`

**Cálculo de Ferramentas**:
```typescript
Custo Ferramenta = Custo Mensal + Outros Custos
```

**Exemplo**:
- Baseline: Analista gasta 15min por feedback, 5000 feedbacks/mês, R$ 40/hora
  - Custo = (40 × 15/60) × 5000 = R$ 50.000/mês
- Pós-IA: Analista gasta 2min por feedback, 5000 feedbacks/mês, R$ 40/hora
  - Custo = (40 × 2/60) × 5000 = R$ 6.667/mês
- Economia = R$ 43.333/mês = R$ 520.000/ano

**DECISION_QUALITY - Custo Adicional de Erros**:
```typescript
Custo Erros = (Número de Decisões × (1 - Taxa de Acerto) × Custo por Erro)
Custo Total = Custo Pessoas + Custo Ferramentas + Custo Erros
```

### 2. REVENUE_INCREASE

**Conceito**: Aumento direto de receita.

**Fórmula**:
```
Economia Mensal = Receita Pós-IA - Receita Baseline
% Melhoria = ((Receita Pós-IA / Receita Baseline) - 1) × 100
```

**Exemplo**:
- Baseline: R$ 100.000/mês
- Pós-IA: R$ 120.000/mês
- Economia = R$ 20.000/mês = R$ 240.000/ano
- % Melhoria = 20%

### 3. MARGIN_IMPROVEMENT

**Conceito**: Melhoria na margem (receita - custos).

**Fórmula**:
```
Margem Baseline = Receita Baseline - Custo Baseline
Margem Pós-IA = Receita Pós-IA - Custo Pós-IA
Economia Mensal = Margem Pós-IA - Margem Baseline
% Melhoria = ((Margem Pós-IA - Margem Baseline) / |Margem Baseline|) × 100
```

**Exemplo**:
- Baseline: Receita R$ 100k, Custo R$ 80k → Margem R$ 20k
- Pós-IA: Receita R$ 120k, Custo R$ 85k → Margem R$ 35k
- Economia = R$ 15.000/mês = R$ 180.000/ano

### 4. RISK_REDUCTION

**Conceito**: Redução de risco financeiro.

**Fórmula**:
```
Risco Baseline = (Probabilidade Baseline / 100) × Impacto Baseline + Custo Mitigação Baseline
Risco Pós-IA = (Probabilidade Pós-IA / 100) × Impacto Pós-IA + Custo Mitigação Pós-IA
Economia Mensal = Risco Baseline - Risco Pós-IA
% Redução = ((Risco Baseline - Risco Pós-IA) / Risco Baseline) × 100
```

**Exemplo**:
- Baseline: Probabilidade 20%, Impacto R$ 500k, Mitigação R$ 10k
  - Risco = (20/100) × 500k + 10k = R$ 110k
- Pós-IA: Probabilidade 5%, Impacto R$ 500k, Mitigação R$ 5k
  - Risco = (5/100) × 500k + 5k = R$ 30k
- Economia = R$ 80.000 (anual, não mensal neste caso)

### 5. SATISFACTION

**Conceito**: Redução de churn e aumento de satisfação.

**Fórmula**:
```
Churn Value Baseline = (Taxa Churn Baseline / 100) × Clientes × Valor por Cliente
Churn Value Pós-IA = (Taxa Churn Pós-IA / 100) × Clientes × Valor por Cliente
Economia Mensal = (Churn Value Baseline - Churn Value Pós-IA) + (Receita Pós-IA - Receita Baseline)
% Melhoria = ((Score Pós-IA - Score Baseline) / Score Baseline) × 100
```

**Exemplo**:
- Baseline: Churn 5%, 1000 clientes, R$ 1000/cliente, Receita R$ 50k
  - Churn Value = (5/100) × 1000 × 1000 = R$ 50k
- Pós-IA: Churn 2%, 1000 clientes, R$ 1000/cliente, Receita R$ 60k
  - Churn Value = (2/100) × 1000 × 1000 = R$ 20k
- Economia = (50k - 20k) + (60k - 50k) = R$ 40.000/mês = R$ 480.000/ano

### 6. RELATED_COSTS

**Conceito**: Redução de custos relacionados (ferramentas, softwares).

**Fórmula**:
```
Custo Anual = Σ(Ferramentas × Frequência Anual)
Economia Mensal = Custo Anual / 12
```

**Nota**: Este tipo é usado principalmente para marcar custos de IA (APIs, serviços) que devem ser subtraídos da economia líquida.

### 7. ANALYTICAL_CAPACITY / OTHER

**Conceito**: Métricas genéricas ou capacidade analítica.

**Fórmula**:
```
Economia Mensal = Valor Pós-IA - Valor Baseline
% Melhoria = ((Valor Pós-IA / Valor Baseline) - 1) × 100
```

## Cálculos Agregados (Dashboard)

### Economia Anual Total

```typescript
Economia Anual = Σ(Economia Mensal de cada Indicador Ativo × 12)
```

### ROI Total

```typescript
ROI Projeto = ((Economia Anual - Investimento Total) / Investimento Total) × 100
ROI Total = Média dos ROIs de projetos em PRODUCTION
```

Onde:
- `Investimento Total = Custo Implementação + (Custo Manutenção Mensal × 12)`

### Payback Médio

```typescript
Payback Projeto = Custo Implementação / Economia Mensal
Payback Médio = Média dos paybacks de projetos em PRODUCTION
```

### Horas Economizadas

```typescript
Horas Baseline/Ano = Σ(Minutos Baseline / 60 × Frequência Anual)
Horas Pós-IA/Ano = Σ(Minutos Pós-IA / 60 × Frequência Anual)
Horas Economizadas = Horas Baseline - Horas Pós-IA
```

### Custo de Mão de Obra

```typescript
Custo MO Baseline = Σ(Horas Anuais × Taxa Horária)
Custo MO Pós-IA = Σ(Horas Anuais × Taxa Horária)
Economia MO = Custo MO Baseline - Custo MO Pós-IA
```

### Custo de IA Anual

```typescript
Custo IA Anual = Σ(Custos marcados como "isIACost" × Frequência Anual)
```

Apenas indicadores do tipo `RELATED_COSTS` com `isIACost = true` são considerados.

### Economia Líquida

```typescript
Economia Líquida = Economia MO - Custo IA Anual
```

### ROI Calculado (Dashboard)

```typescript
ROI Calculado = ((Economia Líquida - Investimento Total) / Investimento Total) × 100
```

### Payback Calculado (Dashboard)

```typescript
Payback Calculado = Investimento Total / (Economia Líquida / 12) [em meses]
```

## Frequências e Conversões

### Multiplicadores Anuais

Os multiplicadores para converter frequências em valores anuais são configuráveis via localStorage:

```typescript
{
  HOUR: 2080,    // Horas trabalhadas por ano
  DAY: 260,      // Dias úteis por ano
  WEEK: 52,       // Semanas por ano
  MONTH: 12,     // Meses por ano
  QUARTER: 4,    // Trimestres por ano
  YEAR: 1        // Anos
}
```

Estes valores podem ser editados na página de Settings e são salvos no localStorage.

## Fluxo de Cálculo

1. **Usuário cria/edita Indicador**
   - Preenche dados Baseline
   - Preenche dados Pós-IA
   - Seleciona tipo de melhoria

2. **Sistema calcula economia do indicador**
   - `calculateIndicatorStats(indicator)` é chamado
   - Retorna: `monthlyEconomy`, `annualEconomy`, `improvementPct`

3. **Sistema agrega métricas do projeto**
   - Soma economias de todos os indicadores ativos
   - Calcula ROI e Payback do projeto

4. **Dashboard agrega todos os projetos**
   - `calculateKPIStats(projects, indicators)` é chamado
   - Retorna: `KPIStats` com todas as métricas agregadas

5. **KPIs são exibidos**
   - Cards de KPI mostram valores principais
   - Gráficos mostram histórico e distribuição

## Validações e Regras de Negócio

### Indicadores

- Indicadores inativos (`is_active = false`) não são considerados nos cálculos
- Indicadores devem ter pelo menos um campo preenchido em Baseline e Pós-IA
- Frequências devem ser números positivos

### Projetos

- Projetos em status `CANCELLED` não são considerados nos cálculos
- Projetos sem indicadores ativos têm ROI = 0
- `implementation_cost` e `monthly_maintenance_cost` devem ser >= 0

### Cálculos

- Divisão por zero é tratada (retorna 0 ou valor padrão)
- Valores negativos são permitidos (podem indicar piora)
- Percentuais são arredondados para 1 casa decimal
- Valores monetários são arredondados para 2 casas decimais

## Exemplos Práticos

### Exemplo 1: Chatbot de Atendimento

**Projeto**: Chatbot para triagem de dúvidas de RH

**Indicador**: Tempo de Resposta
- Tipo: SPEED
- Baseline: 30min por dúvida, 200 dúvidas/mês, R$ 50/hora
  - Custo = (50 × 30/60) × 200 = R$ 5.000/mês
- Pós-IA: 5min por dúvida, 200 dúvidas/mês, R$ 50/hora
  - Custo = (50 × 5/60) × 200 = R$ 833/mês
- Economia = R$ 4.167/mês = R$ 50.000/ano

**Investimento**: R$ 30.000 (implementação) + R$ 500/mês (manutenção)
- Investimento Total = 30.000 + (500 × 12) = R$ 36.000
- ROI = ((50.000 - 36.000) / 36.000) × 100 = 38.9%
- Payback = 30.000 / (50.000/12) = 7.2 meses

### Exemplo 2: Análise de Sentimento NPS

**Projeto**: Processamento automático de feedbacks

**Indicador 1**: Tempo de Análise
- Tipo: PRODUCTIVITY
- Baseline: 15min por feedback, 5000 feedbacks/mês, R$ 40/hora
  - Custo = (40 × 15/60) × 5000 = R$ 50.000/mês
- Pós-IA: 2min por feedback, 5000 feedbacks/mês, R$ 40/hora
  - Custo = (40 × 2/60) × 5000 = R$ 6.667/mês
- Economia = R$ 43.333/mês

**Indicador 2**: Taxa de Erro
- Tipo: DECISION_QUALITY
- Baseline: 12% erro, 5000 decisões, R$ 10 por erro
  - Custo Erros = 5000 × (12/100) × 10 = R$ 6.000/mês
- Pós-IA: 4% erro, 5000 decisões, R$ 10 por erro
  - Custo Erros = 5000 × (4/100) × 10 = R$ 2.000/mês
- Economia = R$ 4.000/mês

**Total**: R$ 47.333/mês = R$ 568.000/ano

**Investimento**: R$ 45.000 + R$ 1.200/mês = R$ 59.400
- ROI = ((568.000 - 59.400) / 59.400) × 100 = 856.6%
- Payback = 45.000 / (568.000/12) = 0.95 meses

## Referências

- Código fonte: `services/dashboardService.ts` - Função `calculateIndicatorStats`
- Código fonte: `services/dashboardService.ts` - Função `calculateKPIStats`
- Tipos: `types.ts` - Todas as interfaces e enums


import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import KPICard from '../components/KPICard';
import { mockStats, economyHistoryData, distributionByTypeData, mockProjects } from '../services/mockData';
import { STATUS_COLORS, DEVELOPMENT_LABELS } from '../constants';
import { GoogleGenAI } from "@google/genai";

const ExecutiveDashboard: React.FC = () => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const generateAIInsight = async () => {
    setLoadingAi(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Carrega o prompt customizado se existir
      let promptTemplate = localStorage.getItem('ai_insight_prompt') || 
        "Analise os dados de ROI de projetos de IA desta organização:\n- ROI Total: {roi_total}%\n- Economia Anual: R$ {economia_anual}\n- Horas economizadas: {horas_economizadas_ano}h\n- Projetos em produção: {projetos_producao}\n- Payback médio: {payback_medio} meses\n\nForneça um insight estratégico curto (3 frases) em Português sobre o desempenho e onde focar.";

      // Faz os replaces das variáveis
      const finalPrompt = promptTemplate
        .replace('{roi_total}', mockStats.roi_total.toString())
        .replace('{economia_anual}', mockStats.economia_anual.toLocaleString())
        .replace('{horas_economizadas_ano}', mockStats.horas_economizadas_ano.toLocaleString())
        .replace('{projetos_producao}', mockStats.projetos_producao.toString())
        .replace('{payback_medio}', mockStats.payback_medio.toString());

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: finalPrompt,
      });

      setAiInsight(response.text || "Insight não disponível no momento.");
    } catch (err) {
      console.error(err);
      setAiInsight("Erro ao gerar insight estratégico via IA.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Executivo</h2>
          <p className="text-slate-500 dark:text-slate-400">Visão consolidada do programa de IA</p>
        </div>
        <button 
          onClick={generateAIInsight}
          disabled={loadingAi}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
        >
          {loadingAi ? (
            <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          )}
          Gerar Insight Executivo
        </button>
      </div>

      {aiInsight && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-5 rounded-2xl flex gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-indigo-600 p-2.5 rounded-xl h-fit text-white shadow-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
          </div>
          <div>
            <h4 className="font-black text-indigo-900 dark:text-indigo-100 text-xs uppercase tracking-widest mb-1">Análise de Portfólio IA</h4>
            <p className="text-indigo-800 dark:text-indigo-200 text-sm leading-relaxed font-medium">{aiInsight}</p>
          </div>
          <button onClick={() => setAiInsight(null)} className="ml-auto text-indigo-400 hover:text-indigo-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard 
          title="ROI Total" 
          value={`${mockStats.roi_total}%`} 
          color="bg-green-600" 
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          trend={{ value: '12%', isUp: true }}
        />
        <KPICard 
          title="Economia Anual" 
          value={`R$ ${(mockStats.economia_anual / 1000).toFixed(0)}k`} 
          color="bg-green-600" 
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          trend={{ value: '5%', isUp: true }}
        />
        <KPICard 
          title="Horas Econom." 
          value={`${mockStats.horas_economizadas_ano.toLocaleString()}`} 
          color="bg-indigo-600" 
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KPICard 
          title="Projetos Produção" 
          value={`${mockStats.projetos_producao}`} 
          color="bg-indigo-600" 
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
        <KPICard 
          title="Concluídos" 
          value={`${mockStats.projetos_concluidos}`} 
          color="bg-teal-600" 
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KPICard 
          title="Payback Médio" 
          value={`${mockStats.payback_medio}m`} 
          color="bg-orange-600" 
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Economia Acumulada ao Longo do Tempo</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={economyHistoryData}>
                <defs>
                  <linearGradient id="colorBruta" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="bruta" stroke="#4CAF50" fillOpacity={1} fill="url(#colorBruta)" strokeWidth={3} />
                <Area type="monotone" dataKey="liquida" stroke="#818cf8" fillOpacity={0} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Distribuição por Tipo</h3>
          <div className="h-80 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionByTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="type"
                >
                  {distributionByTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
              <span className="text-2xl font-bold">100%</span>
              <span className="text-xs text-slate-500 uppercase tracking-wider">Total</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {distributionByTypeData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-500 dark:text-slate-400">{item.type}</span>
                </div>
                <span className="font-bold">R$ {(item.value / 1000).toFixed(0)}k</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;

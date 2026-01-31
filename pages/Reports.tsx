
import React, { useState, useEffect } from 'react';
import { dashboardService } from '../services/dashboardService';
import { DEVELOPMENT_LABELS } from '../constants';
import { Project, KPIStats } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Reports: React.FC = () => {
  const { profile } = useAuth();
  const [exporting, setExporting] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<KPIStats>({
    roi_total: 0,
    economia_anual: 0,
    horas_economizadas_ano: 0,
    projetos_producao: 0,
    projetos_concluidos: 0,
    payback_medio: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportsData();
  }, [profile?.organization_id]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      const organizationId = profile?.organization_id || undefined;
      const data = await dashboardService.getDashboardData(organizationId);

      setProjects(data.projects);
      setStats(data.stats);
    } catch (error) {
      console.error('Erro ao carregar dados para relatório:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    setExporting('CSV');

    // Header do CSV
    const headers = ['Nome do Projeto', 'Status', 'Tipo', 'Área', 'Investimento Inicial', 'Economia Anual', 'ROI (%)'];

    // Dados formatados usando projetos reais
    const rows = projects.map(p => [
      p.name,
      p.status,
      DEVELOPMENT_LABELS[p.development_type] || 'N/A',
      p.business_area || 'N/A',
      p.implementation_cost.toString(),
      (p.total_economy_annual || 0).toString(),
      (p.roi_percentage || 0).toString()
    ]);

    // Montagem da string CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Download do Blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ROI_Portfolio_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setExporting(null), 1000);
  };

  const exportToPDF = () => {
    // Simplesmente aciona o print do sistema que pode ser salvo como PDF
    // Os estilos @media print no index.html garantem uma saída limpa
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-indigo-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-slate-500 dark:text-slate-400 font-bold">Carregando dados do relatório...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header visível apenas na web */}
      <div className="no-print">
        <h2 className="text-2xl font-bold">Central de Relatórios</h2>
        <p className="text-slate-500 dark:text-slate-400">Exporte dados estratégicos para apresentações e análises externas.</p>
      </div>

      {/* Grid de Opções de Relatório - no-print */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
        {/* Card 1: Portfólio Completo */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
              <h3 className="text-lg font-bold">Relatório de Portfólio</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Visão tabular completa de todos os projetos, custos e ROIs consolidados.</p>
            </div>
          </div>
          <div className="flex gap-3 mt-8">
            <button
              onClick={exportToCSV}
              disabled={!!exporting || projects.length === 0}
              className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'CSV' ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              )}
              Exportar CSV
            </button>
            <button
              onClick={exportToPDF}
              disabled={projects.length === 0}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Gerar PDF
            </button>
          </div>
        </div>

        {/* Card 2: Executive Summary */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between opacity-60">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <h3 className="text-lg font-bold">Resumo Executivo (Slides)</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Apresentação visual otimizada com gráficos e insights de IA prontos para Comitê.</p>
            </div>
          </div>
          <div className="mt-8 flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            EM DESENVOLVIMENTO
          </div>
        </div>
      </div>

      {/* Visualização de Impressão (Preview que se torna o PDF) */}
      <div className="bg-white text-slate-900 p-12 rounded-xl border border-slate-200 hidden print:block print:m-0 print:border-none">
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
          <div>
            <h1 className="text-4xl font-black">RELATÓRIO DE ROI IA</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest mt-1">Innovation Latam - Portfólio Consolidado</p>
          </div>
          <div className="text-right">
            <p className="font-bold">Data de Emissão</p>
            <p>{new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* Resumo no PDF usando dados reais */}
        <div className="grid grid-cols-4 gap-4 mb-12">
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-[10px] font-black uppercase text-slate-400">ROI Médio</p>
            <p className="text-2xl font-black">{stats.roi_total}%</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-[10px] font-black uppercase text-slate-400">Economia Anual</p>
            <p className="text-2xl font-black">R$ {stats.economia_anual.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-[10px] font-black uppercase text-slate-400">Horas Salvas</p>
            <p className="text-2xl font-black">{stats.horas_economizadas_ano.toLocaleString()}h</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-[10px] font-black uppercase text-slate-400">Payback Médio</p>
            <p className="text-2xl font-black">{stats.payback_medio}m</p>
          </div>
        </div>

        {/* Tabela no PDF usando projetos reais */}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="py-4 text-xs font-black uppercase">Projeto</th>
              <th className="py-4 text-xs font-black uppercase">Área</th>
              <th className="py-4 text-xs font-black uppercase">Tipo</th>
              <th className="py-4 text-xs font-black uppercase text-right">Economia Anual</th>
              <th className="py-4 text-xs font-black uppercase text-right">ROI (%)</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  Nenhum projeto encontrado
                </td>
              </tr>
            ) : (
              projects.map(p => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-4">
                    <p className="font-bold">{p.name}</p>
                    <p className="text-[10px] text-slate-400">{p.status}</p>
                  </td>
                  <td className="py-4 text-sm font-medium">{p.business_area || 'N/A'}</td>
                  <td className="py-4 text-sm font-medium">{DEVELOPMENT_LABELS[p.development_type] || 'N/A'}</td>
                  <td className="py-4 text-sm font-bold text-right">R$ {(p.total_economy_annual || 0).toLocaleString()}</td>
                  <td className="py-4 text-sm font-black text-right text-indigo-600">{p.roi_percentage || 0}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mt-20 pt-8 border-t border-slate-100 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          Documento gerado automaticamente via ROI Analytics Pro Platform
        </div>
      </div>
    </div>
  );
};

export default Reports;

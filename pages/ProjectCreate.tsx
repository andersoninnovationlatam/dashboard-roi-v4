
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { ProjectStatus, DevelopmentType } from '../types';
import { DEVELOPMENT_LABELS } from '../constants';
import ToastContainer from '../components/ToastContainer';
import { useToast } from '../hooks/useToast';

const ProjectCreate: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { toasts, showToast, removeToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    business_area: '',
    sponsor: '',
    development_type: DevelopmentType.CHATBOT,
    status: ProjectStatus.PLANNING,
    implementation_cost: 0,
    monthly_maintenance_cost: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newProject = await projectService.create({
        organization_id: '', // Será substituído pela organização padrão automaticamente
        ...formData,
        start_date: new Date().toISOString().split('T')[0],
      });

      navigate(`/projects/${newProject.id}`);
      showToast('Projeto criado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      showToast('Erro ao criar projeto. Tente novamente.', 'error');
      setLoading(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/projects')}
            className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-2xl font-bold">Novo Projeto de IA</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Inicie a mensuração de ROI para uma nova iniciativa.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Informações Básicas */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-sm font-black uppercase text-indigo-500 tracking-widest border-b border-slate-50 dark:border-slate-800 pb-2">Informações Gerais</h3>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Nome do Projeto</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Ex: Automatização de Jurídico V2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Descrição da Iniciativa</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-24"
                  placeholder="Descreva brevemente o objetivo do projeto e o problema que ele resolve..."
                />
              </div>
            </div>

            {/* Categorização */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Área de Negócio</label>
              <input
                value={formData.business_area}
                onChange={(e) => setFormData({ ...formData, business_area: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ex: CX, Jurídico, RH..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Patrocinador (Sponsor)</label>
              <input
                value={formData.sponsor}
                onChange={(e) => setFormData({ ...formData, sponsor: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Nome do executivo responsável"
              />
            </div>

            {/* Configuração Técnica */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Tipo de Desenvolvimento</label>
              <select
                value={formData.development_type}
                onChange={(e) => setFormData({ ...formData, development_type: e.target.value as DevelopmentType })}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
              >
                {Object.entries(DEVELOPMENT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Status Inicial</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
              >
                <option value={ProjectStatus.PLANNING}>Planejamento</option>
                <option value={ProjectStatus.DEVELOPMENT}>Desenvolvimento</option>
                <option value={ProjectStatus.PRODUCTION}>Produção</option>
              </select>
            </div>

            {/* Financeiro */}
            <div className="space-y-4 md:col-span-2 mt-4">
              <h3 className="text-sm font-black uppercase text-indigo-500 tracking-widest border-b border-slate-50 dark:border-slate-800 pb-2">Financeiro Estimado</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">CAPEX (Investimento Inicial R$)</label>
                  <input
                    type="number"
                    value={formData.implementation_cost || ''}
                    onChange={(e) => setFormData({ ...formData, implementation_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">OPEX (Manutenção Mensal R$)</label>
                  <input
                    type="number"
                    value={formData.monthly_maintenance_cost || ''}
                    onChange={(e) => setFormData({ ...formData, monthly_maintenance_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-8 border-t border-slate-50 dark:border-slate-800">
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="px-8 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#951b81] text-white px-10 py-4 rounded-xl font-black hover:bg-[#951b81] transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Salvando...
                </>
              ) : (
                'Criar Projeto e Definir ROI'
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ProjectCreate;

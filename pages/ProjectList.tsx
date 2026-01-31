
import React, { useState, useEffect } from 'react';
import { projectService } from '../services/projectService';
import { Project } from '../types';
import { STATUS_COLORS, DEVELOPMENT_LABELS } from '../constants';
import { Link } from 'react-router-dom';

const ProjectList: React.FC = () => {
  const [filter, setFilter] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await projectService.getAll(); // Busca organização padrão automaticamente
      setProjects(data);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    p.business_area?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold">Portfólio de Projetos</h2>
          <p className="text-slate-500 dark:text-slate-400">Gerencie e acompanhe o ROI de suas iniciativas de IA</p>
        </div>
        <Link
          to="/projects/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Novo Projeto
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
        <div className="relative flex-1">
          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Buscar por nome ou área..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <select className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-600 dark:text-slate-300 outline-none">
          <option>Todos os Status</option>
          <option>Produção</option>
          <option>Desenvolvimento</option>
          <option>Planejamento</option>
        </select>
      </div>

      {loading ? (
        <div className="p-10 text-center">Carregando projetos...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p) => (
            <div key={p.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-500/50 transition-all group overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[p.status]}`}>
                    {p.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{p.start_date}</span>
                </div>
                <h3 className="text-xl font-bold mb-1 group-hover:text-indigo-500 transition-colors">
                  {p.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-6">
                  {p.description}
                </p>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-black block tracking-widest mb-1">Economia</span>
                    <span className="text-sm font-black">R$ {p.total_economy_annual?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-black block tracking-widest mb-1">ROI</span>
                    <span className="text-sm font-black text-green-500">+{p.roi_percentage}%</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{DEVELOPMENT_LABELS[p.development_type]}</span>
                <Link to={`/projects/${p.id}`} className="text-indigo-600 dark:text-indigo-400 text-xs font-black hover:underline flex items-center gap-1 uppercase tracking-tighter">
                  Ver Indicadores
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectList;

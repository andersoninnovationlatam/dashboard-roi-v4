
import React, { useState, useEffect } from 'react';

interface SettingsProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const DEFAULT_PROMPT = "Analise os dados de ROI de projetos de IA desta organização:\n- ROI Total: {roi_total}%\n- Economia Anual: R$ {economia_anual}\n- Horas economizadas: {horas_economizadas_ano}h\n- Projetos em produção: {projetos_producao}\n- Payback médio: {payback_medio} meses\n\nForneça um insight estratégico curto (3 frases) em Português sobre o desempenho e onde focar.";

const Settings: React.FC<SettingsProps> = ({ theme, toggleTheme }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    const savedPrompt = localStorage.getItem('ai_insight_prompt') || DEFAULT_PROMPT;
    setPrompt(savedPrompt);
  }, []);

  const handleSavePrompt = () => {
    localStorage.setItem('ai_insight_prompt', prompt);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Configurações</h2>
        <p className="text-slate-500 dark:text-slate-400">Gerencie as preferências da plataforma e motor de IA</p>
      </div>

      {/* Tema e Aparência */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
        <h3 className="text-lg font-bold mb-6">Aparência do Sistema</h3>
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <div>
            <p className="font-bold">Tema da Interface</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Alternar entre os modos claro e escuro.</p>
          </div>
          <button 
            onClick={toggleTheme}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
          >
            {theme === 'dark' ? (
              <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" /></svg>
            ) : (
              <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* IA Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold">Inteligência Artificial</h3>
          <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black border border-green-500/30 uppercase">Ativo</span>
        </div>
        
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <p className="font-bold">Motor de Insights ROI</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Configure como a IA analisa seus dados estratégicos.</p>
            </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all"
          >
            Configurar Prompt
          </button>
        </div>
      </div>

      {/* Modal para Prompt */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-black">Configurar Prompt Mestre</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8 space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Utilize as variáveis entre chaves <code>{'{variavel}'}</code> para que a plataforma insira os dados reais no momento da análise.
              </p>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-64 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-indigo-300"
              />
              <div className="flex gap-2 flex-wrap">
                {['roi_total', 'economia_anual', 'horas_economizadas_ano', 'payback_medio'].map(tag => (
                  <span key={tag} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono text-slate-500 uppercase">{`{${tag}}`}</span>
                ))}
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
              <button onClick={() => setPrompt(DEFAULT_PROMPT)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Resetar Padrão</button>
              <button onClick={handleSavePrompt} className="px-8 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all">Salvar Configuração</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

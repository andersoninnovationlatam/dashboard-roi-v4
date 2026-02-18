import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (!formData.organizationName.trim()) {
      setError('Por favor, informe o nome da sua empresa.');
      return;
    }

    setLoading(true);
    try {
      await signUp(formData.email, formData.password, formData.fullName, formData.organizationName);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 transition-colors">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20 mb-4 text-white font-black text-3xl">
            IL
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Criar Conta</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Cadastre-se para começar a gerenciar seus projetos de IA</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl border border-red-100 dark:border-red-800">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Nome Completo</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
              placeholder="João Silva"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Nome da Empresa</label>
            <input
              type="text"
              required
              value={formData.organizationName}
              onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
              placeholder="Minha Empresa Ltda"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">E-mail Corporativo</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
              placeholder="exemplo@empresa.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Senha</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
              placeholder="••••••••"
            />
            <p className="text-[10px] text-slate-400">Mínimo de 6 caracteres</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Confirmar Senha</label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Criar Conta'}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-500 dark:text-slate-400 text-sm">
          Já tem uma conta? <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Fazer login</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;

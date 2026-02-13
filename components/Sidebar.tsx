
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === UserRole.ADMIN;

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      {/* Backdrop para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={onToggle}
        />
      )}

      <div className={`
        bg-slate-900 h-screen fixed left-0 top-0 text-white flex flex-col z-50 shadow-2xl
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20'}
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3 relative">
          <button
            onClick={onToggle}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-500 transition-colors shadow-lg z-10"
            aria-label="Toggle sidebar"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-0' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/20 transition-transform hover:scale-105 cursor-pointer flex-shrink-0">IL</div>
          {isOpen && (
            <div className="overflow-hidden">
              <h1 className="font-black text-lg leading-tight tracking-tight whitespace-nowrap">ROI Analytics</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest whitespace-nowrap">Innovation Latam</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          <NavLink
            to="/"
            className={({ isActive }) => `flex items-center gap-3 p-3.5 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${!isOpen ? 'justify-center' : ''}`}
            title="Dashboard Executivo"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m0 0l-7 7-7-7M19 10v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            {isOpen && <span className="whitespace-nowrap">Dashboard Executivo</span>}
          </NavLink>

          <NavLink
            to="/projects"
            className={({ isActive }) => `flex items-center gap-3 p-3.5 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${!isOpen ? 'justify-center' : ''}`}
            title="Portfólio de Projetos"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            {isOpen && <span className="whitespace-nowrap">Portfólio de Projetos</span>}
          </NavLink>

          <NavLink
            to="/reports"
            className={({ isActive }) => `flex items-center gap-3 p-3.5 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${!isOpen ? 'justify-center' : ''}`}
            title="Relatórios"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {isOpen && <span className="whitespace-nowrap">Relatórios</span>}
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/team"
              className={({ isActive }) => `flex items-center gap-3 p-3.5 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${!isOpen ? 'justify-center' : ''}`}
              title="Gestão de Equipe"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              {isOpen && <span className="whitespace-nowrap">Gestão de Equipe</span>}
            </NavLink>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-1">
          <NavLink
            to="/settings"
            className={({ isActive }) => `flex items-center gap-3 p-3.5 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${!isOpen ? 'justify-center' : ''}`}
            title="Configurações"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {isOpen && (
              <div className="flex items-center justify-between w-full">
                <span className="whitespace-nowrap">Configurações</span>
                <p className="text-xs text-slate-500">v0.3.6</p>
              </div>
            )}
          </NavLink>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-all ${!isOpen ? 'justify-center' : ''}`}
            title="Sair do Sistema"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            {isOpen && <span className="whitespace-nowrap">Sair do Sistema</span>}
          </button>

        </div>
      </div>
    </>
  );
};

export default Sidebar;

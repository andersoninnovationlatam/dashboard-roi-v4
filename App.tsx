import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import ProjectList from './pages/ProjectList';
import ProjectDetail from './pages/ProjectDetail';
import ProjectCreate from './pages/ProjectCreate';
import Settings from './pages/Settings';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Reports from './pages/Reports';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('sidebarOpen', String(sidebarOpen));
  }, [sidebarOpen]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-indigo-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-slate-500 dark:text-slate-400 font-bold">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <div className="flex bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-300">
        <div className="no-print">
          <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
        </div>
        <main className={`flex-1 transition-all duration-300 p-6 md:p-10 ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
          {/* Botão de menu para mobile */}
          <button
            onClick={toggleSidebar}
            className="md:hidden fixed top-4 left-4 z-30 w-10 h-10 bg-indigo-700 text-white rounded-lg flex items-center justify-center shadow-lg hover:bg-indigo-500 transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="max-w-7xl mx-auto text-slate-900 dark:text-slate-100">
            <Routes>
              <Route path="/" element={<ExecutiveDashboard />} />
              <Route path="/projects" element={<ProjectList />} />
              <Route path="/projects/new" element={<ProjectCreate />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings theme={theme} toggleTheme={toggleTheme} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

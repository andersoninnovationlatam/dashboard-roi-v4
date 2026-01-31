
import React from 'react';

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: string;
    isUp: boolean;
  };
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, color, trend }) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-2 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</span>
        <div className={`p-2 rounded-lg ${color} text-white shadow-lg`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-slate-900 dark:text-white">{value}</span>
      </div>
      {trend && (
        <div className={`text-xs flex items-center gap-1 font-bold ${trend.isUp ? 'text-green-500' : 'text-red-500'}`}>
          {trend.isUp ? (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
          )}
          {trend.value}
        </div>
      )}
    </div>
  );
};

export default KPICard;

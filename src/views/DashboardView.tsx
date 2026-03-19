import { motion } from 'motion/react';
import { TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Profile, Document } from '../types';

interface DashboardViewProps {
  profile: Profile;
  onProfileClick: () => void;
  income: number;
  expenses: number;
  paidPercentage: number;
  documents: Document[];
  darkMode?: boolean;
  key?: string;
}

const DashboardView = ({ profile, income, expenses, paidPercentage, documents, darkMode }: DashboardViewProps) => {
  const displayYear = new Date().getFullYear();

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  };

  const item = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } },
  };

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, '0');
    const currentYear = new Date().getFullYear();
    const monthDocs = documents.filter(d => {
      const date = new Date(d.date);
      return date.getFullYear() === currentYear && date.getMonth() === i;
    });
    const monthIncome = monthDocs.filter(d => d.type === 'invoice' && d.status === 'paid').reduce((s, d) => s + d.amount, 0);
    const monthExpenses = monthDocs.filter(d => d.type === 'expense').reduce((s, d) => s + d.amount, 0);
    return { name: month, income: monthIncome, expenses: monthExpenses, net: monthIncome - monthExpenses };
  });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-6 pb-24">
      <motion.div variants={item} className="space-y-1">
        <h2 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Ciao, {profile.name.split(' ')[0]}!</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{profile.country}</p>
      </motion.div>

      <motion.div variants={item} className={`rounded-3xl p-6 shadow-sm border transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} space-y-4`}>
        <div className="flex justify-between items-center">
          <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Entrate Annuali</span>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizzato</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gen, {displayYear} - Dic, {displayYear}</p>
          <h2 className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>€{income.toLocaleString()}</h2>
        </div>
        <div className={`pt-4 border-t flex justify-between items-center ${darkMode ? 'border-slate-800' : 'border-slate-50'}`}>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fatture Saldate</span>
          <span className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-900'}`}>{paidPercentage}%</span>
        </div>
      </motion.div>

      <motion.div variants={item} className={`rounded-3xl border transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} overflow-hidden`}>
        <div className={`px-6 py-5 flex items-center justify-between border-b ${darkMode ? 'border-slate-800' : 'border-slate-50'}`}>
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margine Netto</p>
            <p className={`text-2xl font-bold ${income - expenses >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>€{(income - expenses).toLocaleString()}</p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${income - expenses >= 0 ? (darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600')}`}>
            {income > 0 ? `${Math.round(((income - expenses) / income) * 100)}%` : '0%'}
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
          <div className="px-5 py-4 space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Totale Spese</p>
            <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>€{expenses.toLocaleString()}</p>
            <div className={`w-full h-1 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div className="bg-red-400 h-full rounded-full" style={{ width: income > 0 ? `${Math.min((expenses / income) * 100, 100)}%` : '0%' }} />
            </div>
          </div>
          <div className="px-5 py-4 space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tasse Stimate</p>
            <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>€{Math.round(income * 0.15).toLocaleString()}</p>
            <div className={`w-full h-1 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div className="bg-primary h-full rounded-full" style={{ width: '15%' }} />
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className={`rounded-3xl p-6 shadow-sm border transition-all hover:shadow-2xl active:scale-[0.99] ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/30 hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-primary/5'} space-y-6`}>
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Andamento Entrate</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Statistiche Mensili</p>
          </div>
          <div className={`p-2 rounded-xl ${darkMode ? 'bg-slate-800 text-primary' : 'bg-slate-50 text-primary'}`}><TrendingUp size={18} /></div>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className={`p-2 rounded-xl border shadow-xl backdrop-blur-md ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-100'}`}>
                      <p className={`text-[10px] font-bold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Mese {payload[0].payload.name}</p>
                      <div className="space-y-0.5">
                        {payload.map((entry: any, index: number) => (
                          <div key={index} className="flex items-center justify-between gap-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{entry.name === 'income' ? 'Entrate' : entry.name === 'expenses' ? 'Uscite' : 'Netto'}</span>
                            <span className={`text-[10px] font-black ${entry.name === 'income' ? 'text-emerald-500' : entry.name === 'expenses' ? 'text-indigo-500' : 'text-blue-500'}`}>€{Math.round(entry.value).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              }} />
              <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
              <Area type="monotone" dataKey="expenses" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" />
              <Area type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorNet)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} dy={10} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between items-center pt-2">
          {[{ label: 'Entrate', color: 'bg-emerald-500' }, { label: 'Uscite', color: 'bg-indigo-500' }, { label: 'Netto', color: 'bg-blue-500' }].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DashboardView;

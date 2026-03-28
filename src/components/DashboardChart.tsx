import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardChartProps {
  data: { name: string; income: number; expenses: number }[];
  darkMode?: boolean;
  theme?: string;
}

export default function DashboardChart({ data, darkMode, theme }: DashboardChartProps) {
  const { t } = useTranslation();
  const isProTheme = theme === 'pro-light' || theme === 'pro-dark';
  const incomeColor = isProTheme ? '#2dd4bf' : '#10b981';
  const expensesColor = isProTheme ? '#c084fc' : '#6366f1';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={incomeColor} stopOpacity={0.3} /><stop offset="95%" stopColor={incomeColor} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={expensesColor} stopOpacity={0.3} /><stop offset="95%" stopColor={expensesColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip content={({ active, payload }) => {
          if (active && payload && payload.length) {
            return (
              <div className={`p-2 rounded-xl border shadow-xl backdrop-blur-md ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-100'}`}>
                <p className={`text-[10px] font-bold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('dashboard.tooltip_month', { month: payload[0].payload.name })}</p>
                <div className="space-y-0.5">
                  {payload.map((entry: { name: string; value: number }, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{entry.name === 'income' ? t('dashboard.chart_income') : t('dashboard.chart_outflows')}</span>
                      <span className="text-[10px] font-black" style={{ color: entry.name === 'income' ? incomeColor : expensesColor }}>€{Math.round(entry.value).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          return null;
        }} />
        <Area type="monotone" dataKey="income" stroke={incomeColor} strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
        <Area type="monotone" dataKey="expenses" stroke={expensesColor} strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} dy={10} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

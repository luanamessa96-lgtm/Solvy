import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardChartProps {
  data: { name: string; income: number; expenses: number }[];
  darkMode?: boolean;
  theme?: string;
}

export default function DashboardChart({ data, darkMode, theme }: DashboardChartProps) {
  const { t } = useTranslation();
  const isPro = theme === 'pro-light' || theme === 'pro-dark';
  const isProDark = theme === 'pro-dark';

  const incomeColor = isPro ? '#2dd4bf' : '#10b981';
  const expensesColor = isPro ? '#c855f7' : '#6366f1';

  const gridColor = isPro
    ? (isProDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')
    : (darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)');

  const tickColor = '#9ca3af';

  const incomeGlow = isPro ? 'drop-shadow(0 0 6px rgba(45, 212, 191, 0.7))' : undefined;
  const expensesGlow = isPro ? 'drop-shadow(0 0 6px rgba(200, 85, 247, 0.7))' : undefined;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={incomeColor} stopOpacity={isPro ? 0.35 : 0.3} />
            <stop offset="95%" stopColor={incomeColor} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={expensesColor} stopOpacity={isPro ? 0.35 : 0.3} />
            <stop offset="95%" stopColor={expensesColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        {isPro && (
          <CartesianGrid
            strokeDasharray="4 4"
            stroke={gridColor}
            vertical={false}
          />
        )}

        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: isPro ? 11 : 10, fontWeight: 'bold', fill: isPro ? tickColor : '#94a3b8' }}
          dy={10}
        />

        {isPro && (
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: tickColor }}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
          />
        )}

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

        <Area
          type="monotone"
          dataKey="income"
          stroke={incomeColor}
          strokeWidth={isPro ? 3 : 3}
          fillOpacity={1}
          fill="url(#colorIncome)"
          tension={isPro ? 0.5 : undefined}
          style={incomeGlow ? { filter: incomeGlow } : undefined}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="expenses"
          stroke={expensesColor}
          strokeWidth={isPro ? 3 : 3}
          fillOpacity={1}
          fill="url(#colorExpenses)"
          tension={isPro ? 0.5 : undefined}
          style={expensesGlow ? { filter: expensesGlow } : undefined}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

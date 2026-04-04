import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardChartProps {
  data: { name: string; income: number; expenses: number }[];
  darkMode?: boolean;
  theme?: string;
  year?: number;
}

export default function DashboardChart({ data, darkMode, theme, year }: DashboardChartProps) {
  const { t, i18n } = useTranslation();
  const isPro = theme === 'pro-light' || theme === 'pro-dark';
  const isProDark = theme === 'pro-dark';

  const incomeColor = isPro ? '#2dd4bf' : '#10b981';
  const expensesColor = isPro ? '#c855f7' : '#6366f1';

  const gridColor = isPro
    ? (isProDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)')
    : (darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)');

  const tickColor = '#9ca3af';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          {/* Gradients */}
          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={incomeColor} stopOpacity={isPro ? 0.4 : 0.3} />
            <stop offset="100%" stopColor={incomeColor} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={expensesColor} stopOpacity={isPro ? 0.4 : 0.3} />
            <stop offset="100%" stopColor={expensesColor} stopOpacity={0} />
          </linearGradient>

          {/* Glow filters (SVG equivalent of ctx.shadowBlur) */}
          {isPro && (
            <>
              <filter id="glow-income" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-expenses" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </>
          )}
        </defs>

        {isPro && (
          <CartesianGrid
            strokeDasharray="6 4"
            stroke={gridColor}
            vertical={false}
          />
        )}

        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 9, fontWeight: 'bold', fill: isPro ? tickColor : '#94a3b8' }}
          dy={10}
          interval={0}
          tickFormatter={(value) => {
            const shortNames = {
              es: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
              it: ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'],
            };
            const lang = i18n.language.startsWith('it') ? 'it' : 'es';
            return shortNames[lang][parseInt(value) - 1] ?? value;
          }}
        />

        {isPro && (
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: tickColor }}
            tickFormatter={(v) => v >= 1000 ? `€${(v / 1000).toFixed(0)}k` : `€${v}`}
          />
        )}

        <Tooltip content={({ active, payload }) => {
          if (active && payload && payload.length) {
            return (
              <div className={`p-2 rounded-xl border shadow-xl backdrop-blur-md ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-100'}`}>
                <p className={`text-[10px] font-bold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{(() => {
                    const monthNames = {
                      es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
                      it: ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'],
                    };
                    const lang = i18n.language.startsWith('it') ? 'it' : 'es';
                    const monthIndex = parseInt(payload[0].payload.name) - 1;
                    const monthLabel = monthNames[lang][monthIndex];
                    return year ? `${monthLabel} ${year}` : monthLabel;
                  })()}</p>
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
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorIncome)"
          tension={isPro ? 0.5 : undefined}
          style={isPro ? { filter: 'url(#glow-income)' } : undefined}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="expenses"
          stroke={expensesColor}
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorExpenses)"
          tension={isPro ? 0.5 : undefined}
          style={isPro ? { filter: 'url(#glow-expenses)' } : undefined}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

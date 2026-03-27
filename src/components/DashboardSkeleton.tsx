export default function DashboardSkeleton({ darkMode }: { darkMode?: boolean }) {
  const pulse = darkMode ? 'bg-slate-800' : 'bg-slate-200';
  const card = `rounded-3xl p-6 border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`;

  return (
    <div className="pb-24 px-6 pt-6 space-y-4 animate-pulse">
      {/* Greeting */}
      <div className="space-y-2 pb-2">
        <div className={`h-7 w-40 rounded-xl ${pulse}`} />
        <div className={`h-3 w-16 rounded-lg ${pulse}`} />
      </div>

      {/* Tab bar */}
      <div className={`h-10 rounded-2xl ${pulse}`} />

      {/* Income card */}
      <div className={card}>
        <div className="flex justify-between items-center mb-4">
          <div className={`h-3 w-24 rounded-lg ${pulse}`} />
          <div className={`h-3 w-16 rounded-lg ${pulse}`} />
        </div>
        <div className={`h-3 w-32 rounded-lg mb-2 ${pulse}`} />
        <div className={`h-9 w-40 rounded-xl mb-4 ${pulse}`} />
        <div className={`h-px w-full ${pulse}`} />
        <div className="flex justify-between mt-4">
          <div className={`h-3 w-24 rounded-lg ${pulse}`} />
          <div className={`h-3 w-10 rounded-lg ${pulse}`} />
        </div>
      </div>

      {/* Net margin card */}
      <div className={card}>
        <div className="flex justify-between items-center mb-4">
          <div className="space-y-2">
            <div className={`h-3 w-20 rounded-lg ${pulse}`} />
            <div className={`h-7 w-28 rounded-xl ${pulse}`} />
          </div>
          <div className={`h-7 w-12 rounded-full ${pulse}`} />
        </div>
        <div className="grid grid-cols-2 gap-px">
          <div className={`h-16 rounded-l-2xl ${pulse}`} />
          <div className={`h-16 rounded-r-2xl ${pulse}`} />
        </div>
      </div>

      {/* Chart card */}
      <div className={card}>
        <div className="flex justify-between items-center mb-4">
          <div className={`h-4 w-28 rounded-lg ${pulse}`} />
          <div className={`h-8 w-8 rounded-xl ${pulse}`} />
        </div>
        <div className={`h-48 w-full rounded-2xl ${pulse}`} />
        <div className="flex gap-4 pt-4">
          <div className={`h-3 w-16 rounded-lg ${pulse}`} />
          <div className={`h-3 w-16 rounded-lg ${pulse}`} />
        </div>
      </div>
    </div>
  );
}

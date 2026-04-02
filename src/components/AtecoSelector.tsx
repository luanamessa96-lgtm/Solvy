import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { ATECO_CATEGORIE } from '../data/ateco';

interface AtecoCategorySelectorProps {
  value?: number;
  onChange: (coefficiente: number) => void;
  darkMode?: boolean;
}

const AtecoSelector = ({ value, onChange, darkMode }: AtecoCategorySelectorProps) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ATECO_CATEGORIE.map(cat => ({ ...cat, matchingCodes: [] as typeof cat.codes }));
    return ATECO_CATEGORIE
      .map(cat => {
        const matchingCodes = cat.codes.filter(
          c => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
        );
        const categoryMatches = cat.label.toLowerCase().includes(q) || String(cat.coefficiente).includes(q);
        return { ...cat, matchingCodes: categoryMatches ? cat.codes.slice(0, 3) : matchingCodes };
      })
      .filter(cat => cat.matchingCodes.length > 0);
  }, [search]);

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <Search size={14} className="text-slate-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca per codice ATECO (es. 62.01)"
          className={`flex-1 text-sm bg-transparent focus:outline-none ${darkMode ? 'text-white placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'}`}
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} className="text-slate-400">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {filtered.map(cat => {
          const isSelected = value === cat.coefficiente;
          const previewCodes = cat.matchingCodes.length > 0 ? cat.matchingCodes.slice(0, 3) : cat.codes.slice(0, 3);
          return (
            <button
              key={cat.coefficiente}
              type="button"
              onClick={() => onChange(cat.coefficiente)}
              className={`w-full text-left p-3 rounded-xl border transition-all active:scale-[0.98] ${
                isSelected
                  ? 'bg-primary/10 border-primary/30'
                  : darkMode
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-white border-slate-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-bold ${isSelected ? 'text-primary' : darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {cat.label}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  isSelected ? 'bg-primary text-white' : darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                }`}>
                  {cat.coefficiente}%
                </span>
              </div>
              <div className="mt-1">
                {cat.matchingCodes.length > 0 && search.trim() ? (
                  <div className="space-y-0.5">
                    {previewCodes.map(c => (
                      <p key={c.code} className="text-[10px] text-slate-400">
                        <span className="font-mono font-bold text-primary">{c.code}</span> — {c.description}
                      </p>
                    ))}
                    {cat.matchingCodes.length > 3 && (
                      <p className="text-[10px] text-slate-400">+{cat.matchingCodes.length - 3} altri codici</p>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400">
                    {cat.codes.slice(0, 3).map(c => c.code).join(', ')}…
                  </p>
                )}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">Nessun codice ATECO trovato per "{search}"</p>
        )}
      </div>
    </div>
  );
};

export default AtecoSelector;

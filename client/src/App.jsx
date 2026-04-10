import { useEffect, useMemo, useState } from 'react';
import PriceChart from './components/PriceChart';
import SearchInput from './components/SearchInput';
import { useDebounce } from './hooks/useDebounce';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const RECENT_KEY = 'stock-dashboard-recent';

const fetchJSON = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
};

function App() {
  const [symbolInput, setSymbolInput] = useState('AAPL');
  const [stock, setStock] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const debouncedQuery = useDebounce(symbolInput, 350);

  const isPositive = useMemo(() => (stock?.change ?? 0) >= 0, [stock]);

  const loadStock = async (symbol) => {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return;

    setLoading(true);
    setError('');

    try {
      const data = await fetchJSON(`${API_BASE}/api/stock?symbol=${encodeURIComponent(normalized)}`);
      setStock(data);
      setRecent((prev) => {
        const next = [normalized, ...prev.filter((x) => x !== normalized)].slice(0, 8);
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        return next;
      });
    } catch (err) {
      setError(err.message || 'Unable to load stock');
      setStock(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock('AAPL');
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSuggestions = async () => {
      if (!debouncedQuery.trim() || debouncedQuery.length < 1) {
        setSuggestions([]);
        return;
      }

      try {
        const items = await fetchJSON(`${API_BASE}/api/suggest?q=${encodeURIComponent(debouncedQuery)}`);
        if (!cancelled) setSuggestions(items);
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    };

    loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Stock Search</h1>
        <p className="mt-2 text-slate-400">Search live market data with automatic API fallback.</p>
      </header>

      <section className="card p-4 sm:p-6">
        <SearchInput
          value={symbolInput}
          onChange={setSymbolInput}
          onSubmit={(e) => {
            e.preventDefault();
            loadStock(symbolInput);
            setSuggestions([]);
          }}
          suggestions={suggestions}
          onPick={(ticker) => {
            setSymbolInput(ticker);
            setSuggestions([]);
            loadStock(ticker);
          }}
        />

        {recent.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-500">Recent:</span>
            {recent.map((item) => (
              <button
                key={item}
                type="button"
                className="rounded-full border border-slate-700 px-3 py-1 text-xs hover:border-emerald-400"
                onClick={() => {
                  setSymbolInput(item);
                  loadStock(item);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 card p-4 sm:p-6">
        {loading && <p className="animate-pulse text-slate-300">Loading stock data…</p>}
        {!loading && error && <p className="text-red-400">{error}</p>}

        {!loading && !error && stock && (
          <>
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm uppercase tracking-wider text-slate-400">{stock.symbol}</p>
                <h2 className="mt-1 text-2xl font-semibold">{stock.companyName}</h2>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-3xl font-bold">${stock.price?.toLocaleString()}</p>
                <p className={`mt-1 text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}
                  {stock.change} ({isPositive ? '+' : ''}
                  {stock.changePercent}%)
                </p>
                <p className="mt-1 text-xs text-slate-500">Source: {stock.source.replace('_', ' ')}</p>
              </div>
            </div>
            <PriceChart data={stock.chart} />
          </>
        )}
      </section>
    </main>
  );
}

export default App;

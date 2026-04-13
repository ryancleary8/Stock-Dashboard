import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PriceChart from '../components/PriceChart';
import SearchInput from '../components/SearchInput';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { fetchJSON } from '../lib/api';
const RECENT_KEY = 'stock-dashboard-recent';
const FAVORITES_KEY = 'stock-dashboard-favorites';


function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [symbolInput, setSymbolInput] = useState('AAPL');
  const [stock, setStock] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState([]);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const debouncedQuery = useDebounce(symbolInput, 350);
  const isPositive = useMemo(() => (stock?.change ?? 0) >= 0, [stock]);
  const isFavorite = useMemo(
    () => Boolean(stock?.symbol && favorites.includes(stock.symbol)),
    [favorites, stock?.symbol]
  );

  const loadAnonymousRecent = () => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const loadUserRecents = async () => {
    const data = await fetchJSON('/api/user/recent-searches', {
      credentials: 'include'
    });
    return data.recentSearches.map((item) => item.symbol);
  };

  const saveRecent = async (normalized) => {
    if (user) {
      await fetchJSON('/api/user/recent-searches', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: normalized })
      });
      const latest = await loadUserRecents();
      setRecent(latest);
      return;
    }

    setRecent((prev) => {
      const next = [normalized, ...prev.filter((x) => x !== normalized)].slice(0, 8);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleFavorite = (symbol) => {
    const normalized = String(symbol || '').trim().toUpperCase();
    if (!normalized) return;

    setFavorites((prev) => {
      const next = prev.includes(normalized)
        ? prev.filter((item) => item !== normalized)
        : [normalized, ...prev].slice(0, 20);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const loadStock = async (symbol) => {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return;

    setLoading(true);
    setError('');

    try {
      const data = await fetchJSON(`/api/stock?symbol=${encodeURIComponent(normalized)}`);
      setStock(data);
      await saveRecent(normalized);
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
    if (authLoading) return;

    if (!user) {
      setRecent(loadAnonymousRecent());
      return;
    }

    loadUserRecents()
      .then((items) => setRecent(items))
      .catch(() => setRecent([]));
  }, [user, authLoading]);

  useEffect(() => {
    let cancelled = false;

    const loadSuggestions = async () => {
      if (!debouncedQuery.trim() || debouncedQuery.length < 1) {
        setSuggestions([]);
        return;
      }

      try {
        const items = await fetchJSON(`/api/suggest?q=${encodeURIComponent(debouncedQuery)}`);
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
    <main className="flex min-h-screen w-full gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <aside className="w-64 shrink-0 self-start space-y-4">
        <section className="card p-4 sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Account</h2>
          {user ? (
            <>
              <p className="mt-1 break-all text-xs text-slate-400">{user.email}</p>
              <button
                type="button"
                className="mt-3 w-full rounded-lg border border-slate-700 px-3 py-2 text-sm hover:border-rose-400"
                onClick={() => logout()}
              >
                Log out
              </button>
            </>
          ) : (
            <div className="mt-3 space-y-2 text-sm">
              <Link
                className="block rounded-lg border border-slate-700 px-3 py-2 text-center hover:border-emerald-400"
                to="/login"
              >
                Sign in
              </Link>
              <Link
                className="block rounded-lg border border-slate-700 px-3 py-2 text-center hover:border-emerald-400"
                to="/signup"
              >
                Create account
              </Link>
            </div>
          )}
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Favorites</h2>
          <p className="mt-1 text-xs text-slate-500">Quickly open stocks you starred.</p>
          <div className="mt-4 space-y-2">
            {favorites.length === 0 && <p className="text-sm text-slate-400">No favorites yet.</p>}
            {favorites.map((item) => (
              <button
                key={item}
                type="button"
                className="block w-full rounded-lg border border-slate-700 px-3 py-2 text-left text-sm hover:border-rose-400"
                onClick={() => {
                  setSymbolInput(item);
                  loadStock(item);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </section>
      </aside>

      <div className="min-w-0 flex-1">
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
                  <div className="flex items-center gap-2">
                    <p className="text-sm uppercase tracking-wider text-slate-400">{stock.symbol}</p>
                    <button
                      type="button"
                      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-rose-400"
                      onClick={() => toggleFavorite(stock.symbol)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className={`h-5 w-5 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'fill-transparent'}`}
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M12 21s-6.8-4.5-9.3-8.2C.8 10 .9 6.7 3.4 4.9a5 5 0 0 1 6.2.4L12 7.6l2.4-2.3a5 5 0 0 1 6.2-.4c2.5 1.8 2.6 5.1.7 7.9C18.8 16.5 12 21 12 21Z" />
                      </svg>
                    </button>
                  </div>
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
      </div>
    </main>
  );
}

export default DashboardPage;

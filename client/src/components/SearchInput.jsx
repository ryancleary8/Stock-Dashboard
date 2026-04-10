const SearchInput = ({ value, onChange, onSubmit, suggestions, onPick }) => {
  return (
    <form className="relative" onSubmit={onSubmit}>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search ticker (AAPL, TSLA, MSFT...)"
        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 pr-24 text-base outline-none transition focus:border-emerald-500"
      />
      <button
        type="submit"
        className="absolute right-2 top-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400"
      >
        Search
      </button>

      {suggestions.length > 0 && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
          {suggestions.map((item) => (
            <button
              key={item.symbol}
              type="button"
              onClick={() => onPick(item.symbol)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-800"
            >
              <span className="font-medium">{item.symbol}</span>
              <span className="ml-3 truncate text-sm text-slate-400">{item.description}</span>
            </button>
          ))}
        </div>
      )}
    </form>
  );
};

export default SearchInput;

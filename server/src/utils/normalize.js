import { AppError } from './errors.js';

export const normalizeSymbol = (input) => {
  const symbol = String(input || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z.\-]/g, '');

  if (!symbol || symbol.length > 12) {
    throw new AppError('Invalid stock symbol.', 400, 'INVALID_SYMBOL');
  }

  return symbol;
};

export const round = (num, digits = 2) => {
  if (typeof num !== 'number' || Number.isNaN(num)) return null;
  return Number(num.toFixed(digits));
};

export const ensureQuote = (quote, provider = 'unknown') => {
  if (!quote || typeof quote.price !== 'number' || Number.isNaN(quote.price)) {
    throw new AppError(`No valid quote data from ${provider}.`, 502, 'QUOTE_UNAVAILABLE');
  }

  return {
    symbol: quote.symbol,
    companyName: quote.companyName || quote.symbol,
    price: round(quote.price),
    change: round(quote.change ?? 0),
    changePercent: round(quote.changePercent ?? 0),
    currency: quote.currency || 'USD',
    source: provider,
    chart: Array.isArray(quote.chart) ? quote.chart : [],
    fetchedAt: new Date().toISOString()
  };
};

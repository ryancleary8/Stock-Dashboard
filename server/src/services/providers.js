import axios from 'axios';
import { load } from 'cheerio';

const http = axios.create({ timeout: 8000 });

const isRateLimitError = (error) => {
  const status = error?.response?.status;
  const message = String(error?.response?.data || error?.message || '').toLowerCase();
  return status === 429 || message.includes('rate limit') || message.includes('api call frequency');
};

export const fetchFromFinnhub = async (symbol, apiKey) => {
  if (!apiKey) throw new Error('Missing FINNHUB_API_KEY');

  const [quoteRes, profileRes, candleRes] = await Promise.all([
    http.get('https://finnhub.io/api/v1/quote', { params: { symbol, token: apiKey } }),
    http.get('https://finnhub.io/api/v1/stock/profile2', { params: { symbol, token: apiKey } }),
    http.get('https://finnhub.io/api/v1/stock/candle', {
      params: {
        symbol,
        resolution: '30',
        from: Math.floor(Date.now() / 1000) - 86400,
        to: Math.floor(Date.now() / 1000),
        token: apiKey
      }
    })
  ]);

  const q = quoteRes.data;
  if (!q || !q.c) throw new Error('Invalid Finnhub quote response');

  const previousClose = Number(q.pc || 0);
  const currentPrice = Number(q.c || 0);
  const change = Number(q.d ?? currentPrice - previousClose);
  const changePercent = Number(q.dp ?? (previousClose ? (change / previousClose) * 100 : 0));

  const chart = Array.isArray(candleRes.data?.c) && Array.isArray(candleRes.data?.t)
    ? candleRes.data.c.map((price, idx) => ({
        time: new Date(candleRes.data.t[idx] * 1000).toISOString().slice(11, 16),
        price: Number(price)
      }))
    : [];

  return {
    symbol,
    companyName: profileRes.data?.name || symbol,
    price: currentPrice,
    change,
    changePercent,
    currency: profileRes.data?.currency || 'USD',
    chart
  };
};

export const fetchFromAlphaVantage = async (symbol, apiKey) => {
  if (!apiKey) throw new Error('Missing ALPHA_VANTAGE_API_KEY');

  const [quoteRes, companyRes, intradayRes] = await Promise.all([
    http.get('https://www.alphavantage.co/query', {
      params: { function: 'GLOBAL_QUOTE', symbol, apikey: apiKey }
    }),
    http.get('https://www.alphavantage.co/query', {
      params: { function: 'OVERVIEW', symbol, apikey: apiKey }
    }),
    http.get('https://www.alphavantage.co/query', {
      params: {
        function: 'TIME_SERIES_INTRADAY',
        symbol,
        interval: '30min',
        outputsize: 'compact',
        apikey: apiKey
      }
    })
  ]);

  if (quoteRes.data?.Note || intradayRes.data?.Note) {
    throw new Error('Alpha Vantage rate limit hit');
  }

  const quote = quoteRes.data?.['Global Quote'];
  if (!quote || !quote['05. price']) throw new Error('Invalid Alpha Vantage quote response');

  const series = intradayRes.data?.['Time Series (30min)'] || {};
  const chart = Object.entries(series)
    .slice(0, 20)
    .reverse()
    .map(([timestamp, value]) => ({
      time: timestamp.slice(11, 16),
      price: Number(value['4. close'])
    }));

  return {
    symbol,
    companyName: companyRes.data?.Name || symbol,
    price: Number(quote['05. price']),
    change: Number(quote['09. change']),
    changePercent: Number(String(quote['10. change percent']).replace('%', '')),
    currency: companyRes.data?.Currency || 'USD',
    chart
  };
};

const parseJson = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const extractYahooState = (html) => {
  const $ = load(html);

  const nextData = $('#__NEXT_DATA__').text().trim();
  if (nextData) {
    const parsed = parseJson(nextData);
    if (parsed) return parsed;
  }

  const scriptBlocks = $('script')
    .map((_i, el) => $(el).html() || '')
    .get();

  for (const block of scriptBlocks) {
    const rootAppMatch = block.match(/root\.App\.main\s*=\s*(\{.*\})\s*;/s);
    if (rootAppMatch?.[1]) {
      const parsed = parseJson(rootAppMatch[1]);
      if (parsed) return parsed;
    }
  }

  return null;
};

const parseYahooQuoteData = (html) => {
  const parsed = extractYahooState(html);
  if (!parsed) throw new Error('Yahoo quote payload not found');

  const store =
    parsed?.props?.pageProps?.quoteSummaryStore ||
    parsed?.context?.dispatcher?.stores?.QuoteSummaryStore ||
    parsed?.context?.dispatcher?.stores?.StreamDataStore;

  const quoteData = parsed?.props?.pageProps?.quoteData;
  const streamQuote =
    store?.quoteData?.[0] ||
    store?.quoteData ||
    parsed?.context?.dispatcher?.stores?.QuoteSummaryStore?.price;

  const symbol = quoteData?.symbol || streamQuote?.symbol || store?.price?.symbol;
  const companyName =
    quoteData?.shortName || streamQuote?.shortName || store?.price?.shortName || symbol;
  const price =
    quoteData?.regularMarketPrice || streamQuote?.regularMarketPrice?.raw || store?.price?.regularMarketPrice?.raw;
  const change =
    quoteData?.regularMarketChange || streamQuote?.regularMarketChange?.raw || store?.price?.regularMarketChange?.raw;
  const changePercent =
    quoteData?.regularMarketChangePercent ||
    streamQuote?.regularMarketChangePercent?.raw ||
    store?.price?.regularMarketChangePercent?.raw;

  const chartRows = quoteData?.spark?.close || [];
  const chart = chartRows
    .filter((p) => typeof p === 'number')
    .slice(-30)
    .map((p, idx, arr) => ({
      time: `${String(idx + 1).padStart(2, '0')}/${String(arr.length).padStart(2, '0')}`,
      price: Number(p)
    }));

  return {
    symbol,
    companyName,
    price: Number(price),
    change: Number(change),
    changePercent: Number(changePercent),
    currency: quoteData?.currency || 'USD',
    chart
  };
};

export const fetchFromYahooScrape = async (symbol) => {
  const url = `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;
  const res = await http.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }
  });

  return parseYahooQuoteData(res.data);
};

export const fetchFromYahooChartApi = async (symbol) => {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
  const res = await http.get(url, {
    params: { interval: '30m', range: '1d' },
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json,text/plain,*/*'
    }
  });

  const result = res.data?.chart?.result?.[0];
  const quote = result?.meta;
  if (!quote?.regularMarketPrice) throw new Error('Invalid Yahoo chart API response');

  const closes = result?.indicators?.quote?.[0]?.close || [];
  const timestamps = result?.timestamp || [];
  const chart = closes
    .map((value, idx) => ({ value, ts: timestamps[idx] }))
    .filter((row) => typeof row.value === 'number' && Number.isFinite(row.value) && row.ts)
    .slice(-30)
    .map((row) => ({
      time: new Date(row.ts * 1000).toISOString().slice(11, 16),
      price: Number(row.value)
    }));

  const price = Number(quote.regularMarketPrice);
  const previousClose = Number(quote.previousClose || 0);
  const change = price - previousClose;
  const changePercent = previousClose ? (change / previousClose) * 100 : 0;

  return {
    symbol: quote.symbol || symbol,
    companyName: quote.shortName || quote.symbol || symbol,
    price,
    change,
    changePercent,
    currency: quote.currency || 'USD',
    chart
  };
};

export const fetchWithProviderFallback = async ({ symbol, finnhubKey, alphaKey }) => {
  const providers = [
    { name: 'finnhub', fn: () => fetchFromFinnhub(symbol, finnhubKey) },
    { name: 'alpha_vantage', fn: () => fetchFromAlphaVantage(symbol, alphaKey) },
    { name: 'yahoo_scrape', fn: () => fetchFromYahooScrape(symbol) },
    { name: 'yahoo_chart_api', fn: () => fetchFromYahooChartApi(symbol) }
  ];

  let lastError;

  for (const provider of providers) {
    try {
      return { quote: await provider.fn(), provider: provider.name };
    } catch (error) {
      lastError = error;
      const rateLimited = isRateLimitError(error);
      const missingKey = String(error.message || '').includes('Missing ');
      const shouldTryNext = rateLimited || missingKey || true;
      if (!shouldTryNext) break;
    }
  }

  throw lastError || new Error('All stock providers failed');
};

export const fetchSuggestions = async (query, finnhubKey) => {
  const q = String(query || '').trim();
  if (q.length < 1) return [];

  if (!finnhubKey) {
    return [
      { symbol: q.toUpperCase(), description: `Search ${q.toUpperCase()}` }
    ];
  }

  const res = await http.get('https://finnhub.io/api/v1/search', {
    params: { q, token: finnhubKey }
  });

  const rows = Array.isArray(res.data?.result) ? res.data.result : [];

  return rows
    .filter((row) => row.type === 'Common Stock' || row.type === 'ETF')
    .slice(0, 8)
    .map((row) => ({
      symbol: row.symbol,
      description: row.description || row.symbol
    }));
};

import axios from 'axios';
import { load } from 'cheerio';

const http = axios.create({ timeout: 8000 });

const isRateLimitError = (error) => {
  const status = error?.response?.status;
  const message = String(error?.response?.data || error?.message || '').toLowerCase();
  return status === 429 || message.includes('rate limit') || message.includes('api call frequency');
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
    quoteData?.regularMarketPrice ||
    streamQuote?.regularMarketPrice?.raw ||
    store?.price?.regularMarketPrice?.raw;
  const change =
    quoteData?.regularMarketChange ||
    streamQuote?.regularMarketChange?.raw ||
    store?.price?.regularMarketChange?.raw;
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

export const fetchFromAlpaca = async (symbol, apiKey, secretKey) => {
  if (!apiKey || !secretKey) throw new Error('Missing Alpaca credentials');

  const headers = {
    'APCA-API-KEY-ID': apiKey,
    'APCA-API-SECRET-KEY': secretKey
  };

  const [quoteRes, barRes] = await Promise.all([
    http.get(`https://data.alpaca.markets/v2/stocks/${encodeURIComponent(symbol)}/quotes/latest`, {
      headers
    }),
    http.get('https://data.alpaca.markets/v2/stocks/bars', {
      headers,
      params: {
        symbols: symbol,
        timeframe: '30Min',
        limit: 30,
        feed: 'iex'
      }
    })
  ]);

  const latestQuote = quoteRes.data?.quote;
  if (!latestQuote?.ap || !latestQuote?.bp) throw new Error('Invalid Alpaca quote response');

  const price = Number(((latestQuote.ap + latestQuote.bp) / 2).toFixed(4));
  const bars = barRes.data?.bars?.[symbol] || [];
  const previousClose = bars.length > 1 ? Number(bars[bars.length - 2]?.c || price) : price;
  const change = price - previousClose;
  const changePercent = previousClose ? (change / previousClose) * 100 : 0;

  const chart = bars.map((bar) => ({
    time: new Date(bar.t).toISOString().slice(11, 16),
    price: Number(bar.c)
  }));

  return {
    symbol,
    companyName: symbol,
    price,
    change,
    changePercent,
    currency: 'USD',
    chart
  };
};

export const fetchWithProviderFallback = async ({ symbol, alpacaKey, alpacaSecret }) => {
  const providers = [
    { name: 'yahoo_chart_api', fn: () => fetchFromYahooChartApi(symbol) },
    { name: 'alpaca', fn: () => fetchFromAlpaca(symbol, alpacaKey, alpacaSecret) },
    { name: 'yahoo_scrape', fn: () => fetchFromYahooScrape(symbol) }
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

export const fetchSuggestions = async (query) => {
  const q = String(query || '').trim();
  if (q.length < 1) return [];

  const res = await http.get('https://query1.finance.yahoo.com/v1/finance/search', {
    params: { q, quotesCount: 8, newsCount: 0 }
  });

  const rows = Array.isArray(res.data?.quotes) ? res.data.quotes : [];

  return rows
    .filter((row) => row.quoteType === 'EQUITY' || row.quoteType === 'ETF')
    .slice(0, 8)
    .map((row) => ({
      symbol: row.symbol,
      description: row.shortname || row.longname || row.symbol
    }));
};

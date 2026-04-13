import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { fetchSuggestions, fetchWithProviderFallback } from './services/providers.js';
import { AppError } from './utils/errors.js';
import { ensureQuote, normalizeSymbol } from './utils/normalize.js';

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: false
  })
);
app.use(express.json());

app.use(
  '/api/',
  rateLimit({
    windowMs: 60 * 1000,
    max: 80,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'stock-dashboard-api', timestamp: new Date().toISOString() });
});

app.get('/api/stock', async (req, res, next) => {
  try {
    const symbol = normalizeSymbol(req.query.symbol);
    const { quote, provider } = await fetchWithProviderFallback({
      symbol,
      alpacaKey: process.env.ALPACA_API_KEY,
      alpacaSecret: process.env.ALPACA_SECRET_KEY
    });

    res.json(ensureQuote(quote, provider));
  } catch (error) {
    next(error);
  }
});

app.get('/api/suggest', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json([]);

    const suggestions = await fetchSuggestions(q);
    res.json(suggestions);
  } catch (error) {
    next(error);
  }
});

app.use((req, _res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404, 'NOT_FOUND'));
});

app.use((error, _req, res, _next) => {
  const status = error instanceof AppError ? error.statusCode : 500;
  const code = error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR';
  const message = status >= 500 ? 'Unable to fetch stock data right now.' : error.message;

  if (status >= 500) {
    console.error('[server-error]', error.message);
  }

  res.status(status).json({ code, message });
});

app.listen(port, () => {
  console.log(`Stock API server running on http://localhost:${port}`);
});

# Stock Dashboard (Full Stack)

A production-ready stock search application with a React + Tailwind frontend and a Node.js + Express backend.

## Features

- Search any stock ticker (e.g., `AAPL`, `TSLA`)
- Shows:
  - Company name
  - Current price
  - Absolute and percent change
  - Mini intraday/weekly chart
- Loading and resilient error states
- Debounced search input + ticker auto-suggest
- Recent searches persisted in local storage
- Responsive, clean UI
- Backend API aggregation with automatic scraping fallback

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS, Recharts
- **Backend:** Node.js, Express, Axios, Cheerio
- **Data sources:** Finnhub, Alpha Vantage, Yahoo Finance scraping fallback

## Project Structure

```
/client   # React + Tailwind app
/server   # Express API + data provider/fallback logic
```

## Environment Variables

Create `server/.env`:

```bash
PORT=4000
FINNHUB_API_KEY=your_finnhub_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
```

> The app still works without API keys by using scraping fallback (subject to source availability).

## Install

From repo root:

```bash
npm install
```

## Run locally

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## API

### `GET /api/stock?symbol=AAPL`

Returns:

```json
{
  "symbol": "AAPL",
  "companyName": "Apple Inc.",
  "price": 187.21,
  "change": -1.12,
  "changePercent": -0.59,
  "currency": "USD",
  "source": "finnhub",
  "chart": [
    { "time": "09:30", "price": 186.8 },
    { "time": "10:00", "price": 187.1 }
  ],
  "fetchedAt": "2026-04-10T00:00:00.000Z"
}
```

### `GET /api/suggest?q=app`

Returns ticker suggestions for typeahead.

## How fallback scraping works

1. Backend first tries quote providers in order:
   - Finnhub
   - Alpha Vantage
2. If API errors, missing keys, or rate limits occur, backend automatically scrapes Yahoo Finance page data.
3. Scraped results are normalized into the same JSON shape as API responses.
4. Frontend remains source-agnostic and only consumes normalized data.

This makes fallback seamless for users even during provider downtime or quota exhaustion.

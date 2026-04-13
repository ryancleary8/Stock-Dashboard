# Stock Dashboard (Full Stack)

A production-minded stock search application with a React + Tailwind frontend and a Node.js + Express backend.

## Features

- Anonymous stock search with resilient provider fallback
- Optional user accounts with cookie-based sessions
- Dedicated `/login` and `/signup` pages (main dashboard kept separate)
- Per-user recent searches stored in database when signed in
- Anonymous recent searches still persisted in localStorage fallback
- Debounced symbol search input with suggestions
- Favorites persisted client-side

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS, Recharts
- **Backend:** Node.js, Express, Prisma ORM, Argon2, JWT, SQLite (default)
- **Data sources:** Yahoo Finance API, Alpaca API, Yahoo Finance scraping fallback

## Project Structure

```text
/client   # React + Tailwind app
/server   # Express API + Prisma + auth/session logic
```

## Environment Variables

Create `server/.env`:

```bash
PORT=4000
CLIENT_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Stock providers
ALPACA_API_KEY=your_alpaca_key
ALPACA_SECRET_KEY=your_alpaca_secret

# Auth/session
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
AUTH_COOKIE_NAME=stockdash_session
COOKIE_SECURE=false
COOKIE_SAMESITE=lax

# Database (SQLite default)
DATABASE_URL=file:./dev.db
```

### Security notes

- Set `COOKIE_SECURE=true` in production (HTTPS).
- Keep `JWT_SECRET` private and rotate if compromised.
- Never commit `.env` files.
- If `JWT_SECRET` is omitted in local development, the server now uses a temporary fallback secret and logs a warning. Always set a real secret outside local dev.

## Install

From repo root:

```bash
npm install
```

## Database setup + migrations

```bash
npm run prisma:generate --workspace server
npm run prisma:migrate --workspace server
```

## Run locally

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## API

### Public endpoints

- `GET /api/health`
- `GET /api/stock?symbol=AAPL`
- `GET /api/suggest?q=app`

### Auth endpoints

#### `POST /api/auth/signup`

Request:

```json
{ "email": "user@example.com", "password": "Password123" }
```

Response (`201`):

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "createdAt": "2026-04-13T00:00:00.000Z",
    "updatedAt": "2026-04-13T00:00:00.000Z"
  }
}
```

#### `POST /api/auth/login`

Request:

```json
{ "email": "user@example.com", "password": "Password123" }
```

Response (`200`): same user payload as signup.

#### `POST /api/auth/logout`

Response: `204 No Content` (clears session cookie).

#### `GET /api/auth/me`

Response (`200`):

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "createdAt": "2026-04-13T00:00:00.000Z",
    "updatedAt": "2026-04-13T00:00:00.000Z"
  }
}
```

Response (`401`) if no valid session.

### Authenticated user recent-search endpoints

#### `GET /api/user/recent-searches`

Response (`200`):

```json
{
  "recentSearches": [
    { "symbol": "MSFT", "updatedAt": "2026-04-13T00:00:00.000Z" },
    { "symbol": "AAPL", "updatedAt": "2026-04-12T00:00:00.000Z" }
  ]
}
```

#### `POST /api/user/recent-searches`

Request:

```json
{ "symbol": " aapl " }
```

Response (`201`):

```json
{ "recentSearch": { "symbol": "AAPL", "updatedAt": "2026-04-13T00:00:00.000Z" } }
```

Notes:
- Symbol is normalized (trim + uppercase + validation).
- Upsert semantics by `(userId, symbol)` with timestamp bump.
- Recents are capped to latest 8 entries.

## Tests

Run backend tests:

```bash
npm run test --workspace server
```

Includes:
- auth middleware protection checks
- signup/login/session restore flow
- authenticated recent-search read/write behavior

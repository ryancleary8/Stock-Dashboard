import 'dotenv/config';

const asBool = (value, fallback = false) => {
  if (value == null) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

export const env = {
  port: Number(process.env.PORT || 4000),
  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: process.env.AUTH_COOKIE_NAME || 'stockdash_session',
  cookieSecure: asBool(process.env.COOKIE_SECURE, process.env.NODE_ENV === 'production'),
  cookieSameSite: process.env.COOKIE_SAMESITE || 'lax',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db'
};

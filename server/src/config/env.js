import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(currentDir, '../..');
const repoRoot = path.resolve(serverRoot, '..');

const dotenvCandidates = [
  path.join(serverRoot, '.env'),
  path.join(repoRoot, '.env')
];

dotenv.config({ path: dotenvCandidates.find((candidate) => existsSync(candidate)) });

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

const asBool = (value, fallback = false) => {
  if (value == null) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
  jwtSecret:
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === 'production' ? '' : 'dev-insecure-jwt-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: process.env.AUTH_COOKIE_NAME || 'stockdash_session',
  cookieSecure: asBool(process.env.COOKIE_SECURE, process.env.NODE_ENV === 'production'),
  cookieSameSite: process.env.COOKIE_SAMESITE || 'lax',
  databaseUrl: process.env.DATABASE_URL
};

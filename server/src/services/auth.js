import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors.js';
import { env } from '../config/env.js';

const baseCookieOptions = {
  httpOnly: true,
  sameSite: env.cookieSameSite,
  secure: env.cookieSecure,
  path: '/'
};

export const assertAuthConfig = () => {
  if (env.nodeEnv === 'production' && !env.jwtSecret) {
    throw new Error('JWT_SECRET is required.');
  }

  if (env.nodeEnv !== 'production' && env.jwtSecret === 'dev-insecure-jwt-secret-change-me') {
    console.warn('[auth] Using fallback JWT secret for local development. Set JWT_SECRET in server/.env.');
  }
};

export const hashPassword = async (password) => argon2.hash(password);

export const verifyPassword = async (password, passwordHash) => argon2.verify(passwordHash, password);

export const signAuthToken = (user) =>
  jwt.sign({ sub: user.id, email: user.email }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const verifyAuthToken = (token) => {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError('Invalid session.', 401, 'INVALID_SESSION');
  }
};

export const setSessionCookie = (res, token) => {
  res.cookie(env.cookieName, token, baseCookieOptions);
};

export const clearSessionCookie = (res) => {
  res.clearCookie(env.cookieName, baseCookieOptions);
};

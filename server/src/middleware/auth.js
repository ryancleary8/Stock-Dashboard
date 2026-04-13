import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { verifyAuthToken } from '../services/auth.js';
import { AppError } from '../utils/errors.js';

export const attachUserFromSession = async (req, _res, next) => {
  try {
    const token = req.cookies?.[env.cookieName];
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = verifyAuthToken(token);
    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.sub) },
      select: { id: true, email: true, createdAt: true, updatedAt: true }
    });

    req.user = user || null;
    return next();
  } catch {
    req.user = null;
    return next();
  }
};

export const requireAuth = (req, _res, next) => {
  if (!req.user) return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
  return next();
};

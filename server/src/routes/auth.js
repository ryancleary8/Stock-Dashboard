import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { AppError } from '../utils/errors.js';
import {
  clearSessionCookie,
  hashPassword,
  setSessionCookie,
  signAuthToken,
  verifyPassword
} from '../services/auth.js';
import { parseLogin, parseSignup } from '../validators/auth.js';

const router = Router();

router.post('/signup', async (req, res, next) => {
  try {
    const { email, password } = parseSignup(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('Email is already in use.', 409, 'EMAIL_TAKEN');

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password)
      },
      select: { id: true, email: true, createdAt: true, updatedAt: true }
    });

    const token = signAuthToken(user);
    setSessionCookie(res, token);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = parseLogin(req.body);

    const userWithHash = await prisma.user.findUnique({ where: { email } });
    if (!userWithHash) throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');

    const ok = await verifyPassword(password, userWithHash.passwordHash);
    if (!ok) throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');

    const user = {
      id: userWithHash.id,
      email: userWithHash.email,
      createdAt: userWithHash.createdAt,
      updatedAt: userWithHash.updatedAt
    };

    const token = signAuthToken(user);
    setSessionCookie(res, token);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.status(204).send();
});

router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required.' });
  return res.json({ user: req.user });
});

export default router;

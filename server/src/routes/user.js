import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { normalizeSymbol } from '../utils/normalize.js';
import { AppError } from '../utils/errors.js';

const router = Router();

router.use(requireAuth);

router.get('/recent-searches', async (req, res, next) => {
  try {
    const items = await prisma.recentSearch.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: { symbol: true, updatedAt: true }
    });

    res.json({ recentSearches: items });
  } catch (error) {
    next(error);
  }
});

router.post('/recent-searches', async (req, res, next) => {
  try {
    if (!req.body || typeof req.body.symbol === 'undefined') {
      throw new AppError('symbol is required.', 400, 'INVALID_PAYLOAD');
    }

    const symbol = normalizeSymbol(req.body.symbol);

    const saved = await prisma.recentSearch.upsert({
      where: { userId_symbol: { userId: req.user.id, symbol } },
      update: { updatedAt: new Date() },
      create: { userId: req.user.id, symbol },
      select: { symbol: true, updatedAt: true }
    });

    const total = await prisma.recentSearch.count({ where: { userId: req.user.id } });
    if (total > 8) {
      const toDelete = await prisma.recentSearch.findMany({
        where: { userId: req.user.id },
        orderBy: { updatedAt: 'asc' },
        take: total - 8,
        select: { id: true }
      });
      if (toDelete.length) {
        await prisma.recentSearch.deleteMany({ where: { id: { in: toDelete.map((i) => i.id) } } });
      }
    }

    res.status(201).json({ recentSearch: saved });
  } catch (error) {
    next(error);
  }
});

export default router;

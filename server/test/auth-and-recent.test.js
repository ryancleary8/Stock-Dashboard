import { before, beforeEach, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import request from 'supertest';

const testDbPath = '/tmp/stock-dashboard-test.db';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = `file:${testDbPath}`;
process.env.AUTH_COOKIE_NAME = 'stockdash_session';

let createApp;
let prisma;

before(async () => {
  if (fs.existsSync(testDbPath)) fs.rmSync(testDbPath, { force: true });

  execSync('npx prisma db push --skip-generate', {
    cwd: new URL('..', import.meta.url),
    stdio: 'pipe',
    env: process.env
  });

  ({ createApp } = await import('../src/app.js'));
  ({ prisma } = await import('../src/db/prisma.js'));
});

beforeEach(async () => {
  await prisma.recentSearch.deleteMany();
  await prisma.user.deleteMany();
});

after(async () => {
  await prisma.$disconnect();
  if (fs.existsSync(testDbPath)) fs.rmSync(testDbPath, { force: true });
});

describe('auth middleware + flow + recent searches', () => {
  it('requires auth for user recent-searches endpoint', async () => {
    const app = createApp();
    const res = await request(app).get('/api/user/recent-searches');
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  it('supports signup, session restore and login validation', async () => {
    const app = createApp();

    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'alice@example.com', password: 'Password123' });

    assert.equal(signupRes.status, 201);
    assert.equal(signupRes.body.user.email, 'alice@example.com');
    const cookie = signupRes.headers['set-cookie'][0];

    const meRes = await request(app).get('/api/auth/me').set('Cookie', cookie);
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.user.email, 'alice@example.com');

    const badLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'wrong' });
    assert.equal(badLogin.status, 401);

    const okLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'Password123' });
    assert.equal(okLogin.status, 200);
  });

  it('stores normalized recent searches for authenticated users', async () => {
    const app = createApp();
    const authRes = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'bob@example.com', password: 'Password123' });

    const cookie = authRes.headers['set-cookie'][0];

    const addRes = await request(app)
      .post('/api/user/recent-searches')
      .set('Cookie', cookie)
      .send({ symbol: ' aapl ' });

    assert.equal(addRes.status, 201);
    assert.equal(addRes.body.recentSearch.symbol, 'AAPL');

    await request(app).post('/api/user/recent-searches').set('Cookie', cookie).send({ symbol: 'msft' });

    const listRes = await request(app).get('/api/user/recent-searches').set('Cookie', cookie);

    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.recentSearches.length, 2);
    assert.equal(listRes.body.recentSearches[0].symbol, 'MSFT');
  });
});

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

const requiredPackages = [
  'concurrently',
  'vite',
  'express',
  'cookie-parser',
  'argon2',
  'jsonwebtoken',
  '@prisma/client',
  'prisma'
];

const missing = requiredPackages.filter((pkg) => {
  try {
    require.resolve(pkg);
    return false;
  } catch {
    return true;
  }
});

if (missing.length) {
  console.log(`[setup] Missing dependencies detected: ${missing.join(', ')}`);
  console.log('[setup] Running npm install for workspace dependencies...');

  const install = spawnSync('npm', ['install', '--include-workspace-root', '--include=dev'], {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (install.status !== 0) {
    console.error('[setup] npm install failed. Please run `npm install` manually and retry.');
    process.exit(install.status ?? 1);
  }
}

const prismaClientEntrypoint = './node_modules/.prisma/client/default.js';
const prismaSchemaPath = './server/prisma/schema.prisma';
const shouldEnsurePrismaClient = existsSync(prismaSchemaPath);

if (shouldEnsurePrismaClient) {
  const prismaClientFile = existsSync(prismaClientEntrypoint)
    ? readFileSync(prismaClientEntrypoint, 'utf8')
    : '';
  const prismaClientNeedsGenerate =
    !prismaClientFile ||
    prismaClientFile.includes('@prisma/client did not initialize yet');

  if (prismaClientNeedsGenerate) {
    console.log('[setup] Prisma client is missing. Running prisma generate...');
    const prismaGenerate = spawnSync('npx', ['prisma', 'generate', '--schema', 'server/prisma/schema.prisma'], {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    if (prismaGenerate.status !== 0) {
      console.error('[setup] Prisma generate failed. Please run `npx prisma generate --schema server/prisma/schema.prisma` and retry.');
      process.exit(prismaGenerate.status ?? 1);
    }
  }
  console.log('[setup] Ensuring local Prisma schema is applied (prisma db push)...');
  const prismaPush = spawnSync('npx', ['prisma', 'db', 'push', '--skip-generate', '--schema', 'server/prisma/schema.prisma'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env
  });

  if (prismaPush.status !== 0) {
    console.error('[setup] Prisma db push failed. Please run `npx prisma db push --skip-generate --schema server/prisma/schema.prisma` and retry.');
    process.exit(prismaPush.status ?? 1);
  }
}


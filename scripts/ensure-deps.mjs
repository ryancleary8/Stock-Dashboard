import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);

const requiredPackages = [
  'concurrently',
  'vite',
  'express',
  'cookie-parser',
  'argon2',
  'jsonwebtoken',
  '@prisma/client'
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

  const install = spawnSync('npm', ['install', '--include-workspace-root'], {
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
    const prismaGenerate = spawnSync('npm', ['run', 'prisma:generate', '--workspace', 'server'], {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    if (prismaGenerate.status !== 0) {
      console.error('[setup] Prisma generate failed. Please run `npm run prisma:generate --workspace server` and retry.');
      process.exit(prismaGenerate.status ?? 1);
    }
  }
}

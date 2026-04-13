import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

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

if (!missing.length) {
  process.exit(0);
}

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

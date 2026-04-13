import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { assertAuthConfig } from './services/auth.js';

assertAuthConfig();

const app = createApp();
const server = http.createServer(app);

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.warn(
      `[server] Port ${env.port} is already in use. Assuming another API server is already running and leaving this watcher idle.`
    );
    return;
  }

  throw error;
});

server.listen(env.port, () => {
  console.log(`Stock API server running on http://localhost:${env.port}`);
});

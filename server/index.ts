import { createApp } from './app.js';
import { APP_NAME, HOST, NODE_ENV, PORT, SESSION_DB_PATH, SHUTDOWN_TIMEOUT_MS } from './config.js';
import { closeAppDb, getAppDb } from './db/appDb.js';
import { closeSessionDb } from './db/connection.js';
import { catalogHeroCount } from './db/queries.js';
import { importCodexCatalog } from './import/codexCatalog.js';
import { log } from './logger.js';

const { app, sessionStore } = createApp();
log('info', 'Session store ready', { app: APP_NAME, path: SESSION_DB_PATH });

try {
  const db = getAppDb();
  if (catalogHeroCount(db) === 0) {
    const summary = importCodexCatalog();
    log('info', 'Imported Codex WoR catalog', summary);
  }
} catch (error) {
  log('warn', 'Codex catalog import skipped', {
    error: error instanceof Error ? error.message : String(error),
  });
}

const server = app.listen(PORT, HOST, () => {
  log('info', 'Server running', { app: APP_NAME, host: HOST, port: PORT, env: NODE_ENV });
});

let shuttingDown = false;
function shutdown(exitCode: number): void {
  if (shuttingDown) return;
  shuttingDown = true;

  let done = false;
  function closeAndExit(): void {
    if (done) return;
    done = true;
    sessionStore.dispose();
    try {
      closeSessionDb();
    } catch (err) {
      log('error', 'Failed to close session DB during shutdown', { error: String(err) });
    }
    try {
      closeAppDb();
    } catch (err) {
      log('error', 'Failed to close app DB during shutdown', { error: String(err) });
    }
    process.exit(exitCode);
  }

  const timeout = setTimeout(closeAndExit, SHUTDOWN_TIMEOUT_MS);
  server.close(() => {
    clearTimeout(timeout);
    closeAndExit();
  });
  server.closeIdleConnections();
  const forceCloseMs = Math.max(0, SHUTDOWN_TIMEOUT_MS - 500);
  setTimeout(() => {
    server.closeAllConnections();
  }, forceCloseMs);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

process.on('unhandledRejection', (reason) => {
  log('error', 'Unhandled promise rejection; shutting down', {
    error: reason instanceof Error ? (reason.stack ?? reason.message) : String(reason),
  });
  shutdown(1);
});
process.on('uncaughtException', (err) => {
  log('error', 'Uncaught exception; shutting down', { error: err.stack ?? err.message });
  shutdown(1);
});

export default app;

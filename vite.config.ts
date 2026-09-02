import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readPackageVersion(): string {
  try {
    const pkgPath = path.join(__dirname, 'package.json');
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    const pkg: unknown = JSON.parse(raw);
    if (!pkg || typeof pkg !== 'object' || !('version' in pkg)) {
      return '0.0.0';
    }
    const version = pkg.version;
    if (typeof version !== 'string') {
      return '0.0.0';
    }
    const v = version.trim();
    return v.length > 0 ? v : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devApiTarget = env.VITE_DEV_API_TARGET || 'http://127.0.0.1:3004';
  const base = env.VITE_BASE_PATH || '/';
  const devPort = Number.parseInt(env.VITE_DEV_PORT || '5174', 10);

  return {
    base,
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(readPackageVersion()),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'client'),
        '@shared': path.resolve(__dirname, 'shared'),
      },
    },
    build: {
      outDir: 'dist/client',
      emptyOutDir: true,
    },
    server: {
      port: Number.isFinite(devPort) && devPort > 0 ? devPort : 5173,
      watch: {
        ignored: ['**/_resources/**', '**/data/**'],
      },
      proxy: {
        '/api': {
          target: devApiTarget,
          changeOrigin: true,
        },
        '/hero-images': {
          target: devApiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});

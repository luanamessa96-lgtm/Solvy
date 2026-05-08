import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'sw-version-inject',
        closeBundle() {
          const swPath = path.resolve(__dirname, 'dist/sw.js');
          if (!fs.existsSync(swPath)) return;
          const content = fs.readFileSync(swPath, 'utf-8');
          const version = Date.now().toString();
          fs.writeFileSync(swPath, content.replace(/const VERSION\s*=\s*'[^']*'/, `const VERSION = '${version}'`));
        },
      },
      {
        // Swap index.html ↔ landing.html dopo il build:
        // - React app va in dist/app.html (servita da Vercel su /app)
        // - Landing diventa dist/index.html (servita da Vercel su / per default)
        name: 'swap-landing-root',
        closeBundle() {
          const distDir = path.resolve(__dirname, 'dist');
          const indexPath  = path.join(distDir, 'index.html');
          const appPath    = path.join(distDir, 'app.html');
          const landingPath = path.join(distDir, 'landing.html');
          if (!fs.existsSync(indexPath) || !fs.existsSync(landingPath)) return;
          fs.renameSync(indexPath, appPath);
          fs.copyFileSync(landingPath, indexPath);
        },
      },
      {
        name: 'non-blocking-css',
        transformIndexHtml(html: string) {
          return html.replace(
            /<link rel="stylesheet"([^>]*href="[^"]*\.css"[^>]*)>/g,
            (_match: string, attrs: string) =>
              `<link rel="preload" as="style"${attrs} onload="this.rel='stylesheet'"><noscript><link rel="stylesheet"${attrs}></noscript>`
          );
        },
      },
    ],
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_KEY': JSON.stringify(env.VITE_SUPABASE_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'esnext',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'i18n': ['i18next', 'react-i18next'],
            'supabase': ['@supabase/supabase-js'],
            'recharts': ['recharts'],
            'html2canvas': ['html2canvas'],
            'jspdf': ['jspdf', 'jspdf-autotable'],
            'motion': ['motion', 'motion/react'],
          },
        },
      },
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
      legalComments: 'none',
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

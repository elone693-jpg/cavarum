import react from '@vitejs/plugin-react';
import path from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { buildCsp, headersFile } from './build/security-headers';

/** Au build : vérifie la configuration, injecte la CSP et produit le fichier d'en-têtes HTTP. */
function cavarumSecurity(): Plugin {
  let supabaseUrl = '';
  return {
    name: 'cavarum-security',
    apply: 'build',
    configResolved(config) {
      supabaseUrl = config.env.VITE_SUPABASE_URL ?? '';
    },
    buildStart() {
      if (!supabaseUrl) this.error('VITE_SUPABASE_URL manquante : impossible de produire la politique de sécurité (voir .env.example)');
    },
    transformIndexHtml(html) {
      const meta = `<meta http-equiv="Content-Security-Policy" content="${buildCsp(supabaseUrl, { forMeta: true })}" />`;
      if (!html.includes('<!-- cavarum:csp -->')) this.error('Repère <!-- cavarum:csp --> absent de index.html');
      return html.replace('<!-- cavarum:csp -->', meta);
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_headers', source: headersFile(supabaseUrl) });
    },
  };
}

export default defineConfig({
  plugins: [react(), cavarumSecurity()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        // Bibliothèques isolées : une mise à jour de l'app ne force pas leur re-téléchargement.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@supabase')) return 'supabase';
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 30000,
    coverage: { reportsDirectory: 'node_modules/.cache/coverage' },
    // Les écrans tournent sous jsdom ; les tests SQL, de migration et de build sous Node.
    projects: [
      { extends: true, test: { name: 'ecrans', environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] } },
      {
        extends: true,
        test: {
          name: 'donnees',
          environment: 'node',
          include: ['scripts/**/*.test.ts', 'supabase/tests/**/*.test.ts', 'build/**/*.test.ts'],
        },
      },
    ],
  },
});

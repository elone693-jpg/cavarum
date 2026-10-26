/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    globals: true,
    // Les tests SQL et de migration tournent sous Node ; les composants sous jsdom.
    environmentMatchGlobs: [['src/**', 'jsdom']],
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'supabase/tests/**/*.test.ts'],
    testTimeout: 30000,
  },
});

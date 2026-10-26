import { defineConfig, devices } from '@playwright/test';

// Le parcours E2E s'exécute contre une instance Supabase réelle (locale ou de test)
// contenant des données migrées : voir README, section « Tests de bout en bout ».
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: 'npm run dev -- --port 5173 --strictPort', port: 5173, reuseExistingServer: true },
});

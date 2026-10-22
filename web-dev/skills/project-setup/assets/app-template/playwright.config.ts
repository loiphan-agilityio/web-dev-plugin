import { defineConfig, devices } from '@playwright/test';

// E2E_BASE_URL points the tests at a running app: CI sets it to the Netlify deploy URL. Without it,
// Playwright builds the app on the mocked API (`pnpm build:mock`) and serves `dist/` with
// `vite preview`, the same build CI deploys.
const deployedUrl = process.env.E2E_BASE_URL;
const isCI = Boolean(process.env.CI);
// GitHub Actions turns the github reporter's lines into annotations; elsewhere they are noise.
const onGitHub = Boolean(process.env.GITHUB_ACTIONS);
const port = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: onGitHub
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: deployedUrl ?? `http://localhost:${port}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: deployedUrl
    ? []
    : {
        command: `pnpm build:mock && pnpm preview --port ${port} --strictPort`,
        url: `http://localhost:${port}`,
        reuseExistingServer: !isCI,
        timeout: 120_000,
      },
});

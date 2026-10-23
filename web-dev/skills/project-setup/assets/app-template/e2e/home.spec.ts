import { expect, test } from '@playwright/test';

test('renders the home page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'app-template' })).toBeVisible();
});

// A deep link reaches the app only when the host serves index.html for every path (`vite preview`,
// and the redirect in netlify.toml); the app then shows its own not-found page.
test('shows the not-found page for an unknown URL', async ({ page }) => {
  await page.goto('/does-not-exist');
  await expect(page.getByText('Page not found')).toBeVisible();
});

// Some browsers refuse service workers (private windows, managed policies), so MSW cannot start in
// the mock build: the app must still render, with a warning in the console.
test.describe('when the browser blocks service workers', () => {
  test.use({ serviceWorkers: 'block' });

  test('still renders the home page', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning') warnings.push(message.text());
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'app-template' })).toBeVisible();
    // Only the local run is always the mock build (playwright.config.ts); a deploy built with
    // `pnpm build` once the app has a backend starts no MSW, so it logs no warning.
    if (!process.env.E2E_BASE_URL) {
      expect(warnings.some((text) => text.startsWith('[MSW] Mocking is off'))).toBe(true);
    }
  });
});

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

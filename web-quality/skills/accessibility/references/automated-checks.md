# Automated accessibility checks with axe and Playwright

For a project with Playwright (a project from the boilerplate has it in `apps/web`): add axe and one
spec that fails on any WCAG 2.x A or AA violation axe can detect.

```bash
pnpm --filter web add -D @axe-core/playwright
```

```ts
// apps/web/e2e/accessibility.spec.ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test('the home page has no detectable WCAG A or AA violation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();
  expect(
    violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })),
  ).toEqual([]);
});
```

Run it with the other e2e tests (`pnpm test:e2e`, part of `pnpm check`). The assertion lists each
violated rule with the elements it hit, so the failure message is the to-do list: an `<img>`
without `alt` on the home page fails it with `{ id: 'image-alt', targets: [['img[src$="vite.svg"]']] }`.
Checked in a project created from the boilerplate: the spec passes on its mock build under the
boilerplate's Content-Security-Policy (axe runs through Playwright, which the page's CSP does not
block), lint and typecheck included. Read each rule's
`helpUrl` in the full `violations` for the fix.

- **One test per important page and state:** navigate, put the page in the state (open the dialog,
  submit an empty form so errors show), then analyze. axe sees only what is rendered.
- **Wait for content first** (the `toBeVisible` line): analyzing a loading skeleton misses the page.
- **Do not disable rules to pass.** When a third-party widget fails and cannot be fixed, exclude
  that element with `.exclude('<selector>')` and say why in a comment.
- In a project from the boilerplate, the Storybook a11y addon runs the same engine on each story;
  e2e covers whole pages and their states.

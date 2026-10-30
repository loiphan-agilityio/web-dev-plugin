---
name: accessibility
description: This skill should be used when the user asks to "check accessibility", "make it accessible", "WCAG audit", "a11y review", "fix keyboard navigation", "screen reader support", "check color contrast" or "add axe tests" in a web app, or when the web-quality audit routes an accessibility finding here. It runs automated axe checks, walks the page by keyboard and through its accessibility tree against WCAG 2.2 AA, fixes the issues in a React app with shadcn/ui, and adds a regression test. Not for content writing or legal compliance advice.
compatibility: "Claude Code, as part of the web-quality plugin: reads the plugin's references/. Needs a browser tool for the keyboard and accessibility-tree checks, and Playwright in the project for the automated test."
allowed-tools: Bash(pnpm test:e2e) Bash(pnpm lint) Bash(pnpm check) Bash(pnpm build) Bash(pnpm typecheck) Bash(pnpm test) Bash(pnpm test *) Bash(pnpm test:e2e *) Bash(pnpm preview *)
---

# accessibility

`allowed-tools` approves this skill's commands only in the turn it is loaded. In any later turn (the user's answer to its question, or a subagent's or background task's result), load it again first (Skill tool, `web-quality:accessibility`, with what arrived as args), then go on: its commands otherwise ask for permission.

Make every page usable by keyboard, screen reader, zoom and low vision, to WCAG 2.2 AA, and keep it
that way with tests. Thresholds: `../../references/thresholds.md`; the checklist:
`references/wcag-checklist.md`.

Automated tools find a part of the problems: no violation from axe does not mean accessible. Report
both the automated result and the manual checks you did, and say which you could not do.

## 1. Automated checks

- **axe in a Playwright test:** follow `references/automated-checks.md` (a project from the
  boilerplate already has the spec; another project adds it), one test per important page and
  state (a dialog open, a form with errors).
- **Already in a project from the boilerplate:** Oxlint's `jsx-a11y` rules in `pnpm lint` (static
  JSX rules) and the Storybook a11y addon, which runs axe on each story in Storybook's
  Accessibility panel.
- Lighthouse's Accessibility score, when available, is a third view of the same kind of rules.

## 2. Manual checks

With the browser tool on the running page, follow `references/wcag-checklist.md`. The ones automated
tools miss most:

1. **Keyboard:** tab through the whole page and the main flow; every action works, focus is always
   visible and never trapped; Escape closes dialogs and menus.
2. **Accessibility tree** (`read_page`): every control has a name and role, headings form an outline,
   images have alternatives, form fields have labels.
3. **Route changes:** after navigating, the title changes and focus lands somewhere sensible.
4. **Zoom and reflow:** mobile width (320–375 px) and 200% zoom, nothing cut off.
5. **Contrast** of the theme's text, borders and focus rings, light and dark.

## 3. Fix

- Prefer native elements and the project's shadcn components (Radix handles focus, roles and
  keyboard) over hand-written ARIA. `aria-*` that contradicts the element is worse than none.
- Fix the theme token, not one element, when contrast fails across the app.
- Every fix keeps the project's gates green (`pnpm check` in a project from the boilerplate).

## 4. Prevent regressions

Keep the axe spec in `e2e/`, one test per important page, so `pnpm check` and CI fail on a new
violation. A component-level issue gets a unit test that queries by role and name
(`getByRole('button', { name: ... })`): such tests fail when the accessible name is lost.

## Result

List: axe violations before → after (rule, element, page), the manual checks done and their
outcome, the fixes (file: what), and **Not checked** (screen reader with real assistive
technology, pages behind sign-in) for a person to finish.

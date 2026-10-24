# WCAG 2.2 AA checklist for a single-page app

Automated rules (axe, Lighthouse) catch only part of these. Each line says how to check it by hand
with the browser tool; `read_page` (the accessibility tree) shows names, roles and states as a
screen reader gets them.

## Perceivable

- **Text alternatives (1.1.1):** every informative `<img>` has an `alt` that says what it shows;
  decorative ones `alt=""` (or `aria-hidden` on an inline SVG); an icon-only button has an accessible
  name (`aria-label` or visually hidden text). Check: the accessibility tree has no unnamed image
  or button.
- **Structure (1.3.1):** one `<h1>` per page, headings in order, lists as lists, tables with headers,
  form fields with a `<label>` (`htmlFor` matching the control's `id`). Landmarks: `<header>`,
  `<nav>`, `<main>`, `<footer>`.
- **Contrast (1.4.3, 1.4.11):** 4.5:1 for normal text, 3:1 for large text, icons, borders of inputs
  and focus indicators, in light and dark themes. Theme tokens decide it: in a project from the
  boilerplate, `packages/ui/src/styles/globals.css`.
- **Not by colour alone (1.4.1):** an error, a required field or a status also has text or an icon.
- **Reflow and zoom (1.4.10, 1.4.4):** usable at 320 CSS px wide and at 200% zoom, no horizontal
  scroll for text, nothing cut off. Check with the browser tool's mobile size.

## Operable

- **Keyboard (2.1.1, 2.1.2):** every action works with Tab, Shift+Tab, Enter, Space, arrows and Escape;
  focus never gets stuck. Check: tab through the page with the browser tool and act on each control.
  A `<div onClick>` is not reachable: use a `<button>` or a link.
- **Focus visible and not hidden (2.4.7, 2.4.11):** a clear ring on every focused control, never
  covered by a sticky header or a toast. shadcn components draw it with `focus-visible:` classes;
  never remove `outline` without a replacement.
- **Focus order and management (2.4.3):** a dialog moves focus in, traps it and returns it on close
  (Radix-based shadcn `Dialog`, `Sheet`, `Popover` do this). After a client-side route change,
  move focus to the new page's `<h1>` or a skip target, and update the document title, or a screen
  reader user does not learn the page changed.
- **Skip link (2.4.1):** a "Skip to main content" link first in the tab order on pages with a header
  or navigation.
- **Page title (2.4.2):** each route has its own `<title>`.
- **Target size (2.5.8):** clickable targets at least 24 × 24 CSS px, or spaced so a 24 px circle
  around each does not overlap another.
- **Motion (2.3.3):** respect `prefers-reduced-motion` for non-essential animation (Tailwind's
  `motion-safe:` / `motion-reduce:` variants).

## Understandable

- **Language (3.1.1):** `<html lang>` matches the content.
- **Labels and instructions (3.3.2):** visible labels, not placeholders alone; required fields say so.
- **Error identification (3.3.1, 3.3.3):** an error names the field and how to fix it, is linked to
  the field (`aria-describedby`, `aria-invalid`), and is announced. In a project from the
  boilerplate, shadcn `Field` + `FieldError` with `aria-invalid` on the control does this.
- **Consistent help and redundant entry (3.2.6, 3.3.7):** help in the same place on each page; do not
  ask twice for what the user already entered in the same flow.
- **Accessible authentication (3.3.8):** no cognitive test to sign in; allow paste and password
  managers in password fields.

## Robust

- **Name, role, value (4.1.2):** custom widgets expose the right role and state (`aria-expanded`,
  `aria-selected`, `aria-checked`). Prefer native elements and the Radix-based shadcn components
  over hand-made ARIA.
- **Status messages (4.1.3):** a toast, a "saved" message or a result count is announced without
  moving focus (`role="status"` or an `aria-live` region; sonner's toaster is a live region).

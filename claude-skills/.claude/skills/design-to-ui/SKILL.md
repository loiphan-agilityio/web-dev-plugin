---
name: design-to-ui
description: Builds or restyles a screen or component in an existing React + shadcn/ui + Tailwind 4 app to match a design - screenshots, mockups or PNG exports, a Figma link, or a DESIGN.md with colors, type and spacing. It maps the design to theme tokens and shadcn components, writes semantic responsive markup with every data state, tests it, and checks it in a browser when one is available. When no design is given it asks once for an optional DESIGN.md or Figma link, and without them uses the app's current theme. Use for "implement this design", "make it look like this screenshot", "make it look like this mockup", "build this screen from this Figma link", "style it with our DESIGN.md", "match the design". When a ticket comes with a design, develop-feature leads and loads this skill for the UI step. Not for a ticket with no design (develop-feature), a single endpoint (integrate-api), or scaffolding a new app (code-skeleton).
---

# design-to-ui

Turn a design into UI inside an app that follows `CLAUDE.md`. Read the project's `CLAUDE.md` first: its names, layout and commands are authoritative.

**The design is a visual target, never an asset.**

- Never embed the screenshot, PNG export or Figma frame in the app (not as an `<img>`, not as a background). It looks right in a screenshot and is useless in a browser: no real text, no accessibility, no responsiveness.
- Never put temporary Figma asset URLs in code. They expire, and the page breaks later with no code change.
- Real assets the design contains (logo, illustrations, photos) are downloaded into the project, for example `src/assets/` and imported (`tsconfig.app.json` has `"types": ["vite/client", ...]`, so image imports typecheck), or `public/` for files that need a fixed URL. If you cannot get an asset, use a neutral placeholder and list it under **Design gaps**.

## Getting library APIs right

The stack is newer than most training data. Copy from the project and the references, not from memory.

- **Tailwind 4 is CSS-first.** There is no `tailwind.config.js` and you do not create one. Theme tokens live in `src/styles/index.css`: values in `:root` / `.dark`, exposed to utilities by `@theme inline` (`--color-primary: var(--primary);` makes `bg-primary` work).
- **Tokens only in components.** No hex, no `bg-[#...]`, no raw palette classes (`bg-indigo-600`, `text-gray-500`) in TSX. They bypass the theme, so the next palette change or a dark theme misses them. The design's raw values go in one place: `src/styles/index.css`.
- **shadcn, style `radix-nova`** (`components.json`). Add a component with `pnpm exec shadcn add <name>`. Never edit `src/components/ui/`: it is generated, lint ignores it, and re-adding a component overwrites your edits. The template ships only `alert button card field input label separator skeleton sonner`; anything else (Textarea, Badge, Dialog, Select...) is added with the CLI first.
- **`cn` from `@/lib/utils`** for conditional classes. Lint rejects `clsx` and `tailwind-merge`.
- **Icons are lucide-react** (`components.json`: `"iconLibrary": "lucide"`), as named imports, the way `src/components/ui/sonner.tsx` does it, in the app's quote style:
  ```tsx sketch
  import { CircleCheckIcon, InfoIcon } from 'lucide-react';
  ```
  No other icon package, and no SVG copied out of the design for an icon lucide already has.
- **Dark mode is not wired.** `index.css` has `@custom-variant dark (&:is(.dark *));` and a `.dark` block, but nothing adds the `.dark` class: there is no ThemeProvider, and `next-themes` is only imported by `src/components/ui/sonner.tsx`. Dark mode is out of scope unless the design shows a dark version; then set the `.dark` token values so the theme is ready, but nothing in the shipped app will show it until something adds the `.dark` class. Switching themes (a toggle, or following `prefers-color-scheme`) is a separate feature: ask before building it, and until it exists report "dark tokens set, dark theme not active in the app" under **Design gaps**.
- **Links** (`Link`, `NavLink`) come from `react-router`, as `src/app/root-layout.tsx` does.
- The other version traps (React Router 8, Vitest 5, Effect, MSW, TanStack Query, forms) are listed once, in the project's `CLAUDE.md`, section "Library versions newer than most training data".

## Workflow

### 0. Get the design

Three sources, all optional; use every one that is present, and look before asking:

- **DESIGN.md:** a path the request names, else `DESIGN.md` or `design/DESIGN.md` in the project. Use it only when it describes the look (colors, type, spacing, radius, components); a document about architecture or code is not a design spec. Read it fully. Its written values (hex colors, font names, sizes, radius) are exact, so they win over values measured from an image or Figma; note each conflict under **Design gaps**.
- **Image paths or pasted images:** read every image with the Read tool, which shows it to you. Note each frame and the width it was drawn at. Check the export scale: Figma and PNG exports are often @2x, so halve every value measured from a 2x export.
- **Figma link:** look for Figma MCP tools in your tool list, or with ToolSearch (query `figma`) if they are deferred.
  - Present (names vary by server version; for example `get_design_context`, `get_screenshot`): request the screenshot of each frame as the visual target, and the design context for exact values (colors, spacing, type, text content). The generated code in the design context uses absolute positioning and raw hex values: read it as a spec, never paste it. Download the image assets it returns into the project.
  - Absent: do not try to fetch the Figma page (it needs a sign-in and renders on a canvas, so a fetch returns nothing usable). Ask the user for a PNG export of each frame, and one per breakpoint if they have them.
- **No source found:** ask once, in one message: "Do you have a DESIGN.md or a Figma link for this? Both are optional; without them I use the app's current theme." Use what the user gives. If they have neither, or say to go ahead, keep the theme in `src/styles/index.css` (skip the value changes in step 2), build with the rules below, and write "no design given: current theme" under **Design gaps**. Under `build-app`, never ask: use what is present, else the current theme.
- **Then list what the design does NOT show:** loading / error / empty states, mobile (or desktop) layout, hover / focus / disabled, dark mode, long text and overflow. Each one goes under **Design gaps**. Ask the user only when a missing piece changes the structure (what a 5-column table becomes on a phone) and the answer is cheap to get; otherwise use the defaults in step 3 and report them as assumptions.

### 1. Inventory

Split the design into regions (app shell, page header, toolbar or filters, list, card, form, footer) and write the list down before coding: it is your plan and your report.

- Map each region to what exists: `src/components/ui/`, `src/components/`, then `src/features/*/components/`. Reuse before writing new.
- The app shell (header and nav around every page) is `src/app/root-layout.tsx`. Change it there, not in each page.
- A missing shadcn component is added through the CLI (`pnpm exec shadcn add <name>`). The design-element-to-component table is in `references/design-mapping.md`.
- A look no variant provides: compose the shadcn component inside a small app component in `src/components/` (shared) or the feature's `components/` (local). Never edit `src/components/ui/`.
- Icons: the closest lucide icon. Name every substitution under **Design gaps**.

### 2. Tokens

Compare the design's colors, font and radius with the theme in `src/styles/index.css`.

- **Different colors or radius: edit the VALUES in `:root`** (and in `.dark` only if the design shows dark), so the whole app follows: every shadcn component, focus ring and toast reads the same variables. A per-component override fixes one place and drifts from the rest.
- **Keep the design's value as given.** A hex color is valid CSS in a custom property: replace the right-hand side (`oklch(...)`) with the design's value. No conversion to oklch, no conversion script.
- **Map by role, not by look.** Each design color gets a role from the table in `references/design-mapping.md`; one color used in two roles is set in both variables.
- **New token only for a role that does not exist** (success, warning): add the variable to `:root` (and `.dark` if dark is in scope) and a `--color-<name>: var(--<name>);` line to `@theme inline`, following the existing `--color-destructive: var(--destructive);`. Add a `-foreground` pair when text sits on it.
- **Values from a DESIGN.md go in as written**, by role, like any other design value.
- **A different font family needs a new `@fontsource` dependency: ASK the user first.** Adding a dependency is the project's decision. Until answered, keep Geist and note it under **Design gaps**.
- **An existing app with other screens:** if the design's palette would restyle screens it does not cover, ask before changing a global value. It is a product decision, not a page detail.

The verbatim `index.css` lines and how to edit them are in `references/design-mapping.md`.

### 3. Build

- **Layout with flex and grid** (`gap-*`, `space-y-*`), not absolute positioning; absolute is for true overlays only. Fixed pixel widths from the frame become `max-w-*` or responsive widths: the frame is one screen size, the browser is every size.
- **Semantic HTML:** `src/app/root-layout.tsx` already renders `header`, `nav` and `main` around every page, so a page uses `section` / `article`, never a second `main` or a page-level `header`. `ul` / `li` for lists, one `h1` per page and headings in order. `CardTitle` renders a `div`, so put the real heading inside it, as `src/app/home-page.tsx` does with `<CardTitle><h1>...</h1></CardTitle>`.
- **Compose small components.** The page lays out regions; each child owns its own query or mutation (`../develop-feature/references/ui-states.md`, section Page composition).
- **Data screens render the four states** (loading, error, empty, success) from `../develop-feature/references/ui-states.md`, styled to match the design: skeletons shaped like the design's rows or cards, the empty state in the design's typography with the next action. A design that shows only the success state does not remove the other three.
- **Spacing and type** round to the 4px rhythm and the type scale (`references/design-mapping.md`); an exact off-scale value only when it is clearly intentional, and it goes under **Design gaps**.
- **Mobile-first:** base classes for the narrow layout, `sm:` / `md:` / `lg:` add the wider one. If the design is desktop-only, collapse sensibly below 640px (`sm:`): columns stack, side navigation moves to the top, wide tables stack or scroll horizontally. Report it as an assumption.
- **Keep interaction states and focus rings.** shadcn variants already carry hover, `focus-visible` and `disabled` styles; do not strip a ring or outline to match a flat mockup. Keyboard users need it, and `jsx-a11y` lint is on.
- Clearly low-contrast text in the design (light gray on white): keep the token, flag it under **Design gaps**.
- **Real data, forms or endpoints:** follow the `develop-feature` skill (schemas, api, queries, form, mocks, routes) and `integrate-api` (one endpoint). Do not re-derive them here.
- **A new page, even with no data,** needs a lazy route factory, its entry in `src/app/routes.tsx` and a nav `<Link>` in `src/app/root-layout.tsx` (`../develop-feature/SKILL.md`, step 5). Wire it before tests and the visual check: both open the page by its URL.

### 4. Tests

- React Testing Library, by role and label, for the visible content of the design: the heading, landmarks, lists, buttons, form labels. `renderRoute('/path')` for a page, `renderWithProviders(<X />)` for a component, both from `@/test/render`. The shape, from `src/app/__tests__/home-page.test.tsx`:
  ```tsx
  renderRoute('/');
  expect(await screen.findByRole('heading', { name: 'app-template' })).toBeInTheDocument();
  ```
- Every component file you create gets a unit test file in the `__tests__/` folder next to it (`components/x.tsx` → `components/__tests__/x.test.tsx`) that renders it alone with `renderWithProviders(<X />)`; the page test covers only the route and how the parts work together. Layout is in `../develop-feature/references/testing.md`.
- Data screens: the four states, in the test of the component that renders them, as in `../develop-feature/references/testing.md`.
- Do not assert class names or colors. A screenshot comparison is not a test, and no visual-regression tooling or Playwright is added: the template does not have it.

### 5. Visual check

Follow `references/visual-check.md`: with a browser tool, open the page, compare it with the design region by region and fix, at most 3 rounds; without one, skip it and say so under **Not done**. With only a DESIGN.md, check that its colors, type and spacing show on the page; with no design at all, only check that the page renders well at the desktop width and at 375px.

### 6. Gates

Run `pnpm lint:fix` (ESLint fixes and Prettier), then `pnpm check` (lint with a Prettier check, typecheck, test, build, Storybook build), each as a plain command with no pipe or redirect (the project allows exactly those commands without a prompt), and read the real output. Fix the cause. Never disable a lint rule, loosen a type, or delete an assertion to get green. If a gate cannot pass, say so in the report.

### 7. Report

Finish with the Result block below, including **Design gaps**.

## References

- `references/design-mapping.md`: read in steps 1 and 2, when mapping design colors, spacing, type, radius, elements and icons to tokens and components, or editing `src/styles/index.css`.
- `references/visual-check.md`: read before step 5, for the browser tools, the dev server and the comparison loop.
- `../develop-feature/references/ui-states.md` (four states) and `../develop-feature/references/testing.md` (state tests), paths relative to this skill's directory: read when the screen shows server data.

## Related skills

Companions installed in projects; priority when they disagree: `CLAUDE.md` and the project skills, then `node_modules/effect/AGENTS.md` and installed types, then companions.

- `shadcn`: components, composition, `Field` layout. Ignore its Tailwind v3 / `tailwind.config.js` branch, its RSC / `"use client"` notes (inert on Vite) and its `next-themes` setup (dark mode is not wired here, see above).
- `vercel-composition-patterns`: compound components and React 19 APIs for splitting the design into small components. Its examples use React Native `TextInput`: adapt to DOM / shadcn.
- `react-testing`: RTL patterns. Vitest only (use `vitest-axe` if you want axe); its MSW imports are v2-style root `msw`, use `msw/http`; first load is `isPending`. It defines its own `renderWithProviders` with the same name as ours: always import ours from `@/test/render`.
- `vercel-react-best-practices`: client-side performance (`rerender-*`, `js-*`, `advanced-*`, most `bundle-*`). Skip `server-*`, `async-api-routes`, `async-suspense-boundaries`, `rendering-hydration-*`, `rendering-resource-hints`, `rendering-script-defer-async`. Replace `next/dynamic` with `React.lazy`, `optimizePackageImports` with direct imports, SWR with TanStack Query, and the raw `fetch` / Promise examples (`async-parallel`, `async-defer-await`) with Effect (`Effect.all` with `concurrency`).
- `develop-feature` (project skill): leads when there is a ticket and loads this skill for the UI step. Hand data work (schemas, api, queries, forms, mocks, routes) to it.
- `integrate-api` (project skill): one endpoint (schema, `ApiClient` call, query or mutation, MSW handler).

No external Figma skill is used: Figma MCP tools, when the session has them, are called directly in step 0.

## Result

End every run with:

```
## Result
**Did:** what was built (files, components added with the CLI, tokens changed, tests) and the `pnpm check` outcome
**Saw:** facts observed (design frames read, existing components reused, visual-check findings, code/doc mismatches)
**Not done:** anything skipped, including "visual check not done" when no browser tool was available, and remaining visual differences
**Blocked by:** unanswered questions (a new font dependency, a global palette change, a missing asset)
**Next:** what the user should answer or do
**Design gaps:** what the design did not specify and what was assumed: states, mobile layout, interaction states, icons substituted, values rounded or arbitrary
```

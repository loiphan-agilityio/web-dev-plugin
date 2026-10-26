---
name: ui-development
description: This skill should be used when the user asks to "implement this design", "make it look like this screenshot", "build this screen from this Figma link", "style it with our DESIGN.md" or "match the mockup" in an app built from the web-dev template (shadcn/ui, Tailwind 4). It turns a design into theme tokens, shadcn components, every data state, tests and a browser check. Not for a ticket without a design (feature-development), one endpoint (api-integration) or a new project (project-setup).
compatibility: "Claude Code, as part of the web-dev plugin only: reads the plugin's references/ and scripts/ and the feature-development skill's references. Needs Node 22.22 or newer and pnpm; the visual check needs a browser tool."
allowed-tools: Bash(pnpm lint) Bash(pnpm lint:fix) Bash(pnpm test) Bash(pnpm test *) Bash(pnpm test:e2e:install) Bash(pnpm check) Bash(pnpm -w check:report) Bash(pnpm exec shadcn add *) Bash(pnpm --filter web test *) Bash(pnpm --filter web exec shadcn add *)
---

# ui-development

Build or restyle a screen so it matches a design. The design is a visual target: the app gets real markup, tokens and components, never the screenshot or Figma frame as an image, and never a temporary Figma asset URL (it expires). Real assets in the design (logo, photos) are downloaded into `src/assets/` and imported, or into `public/` when they need a fixed URL; one that cannot be fetched gets a neutral placeholder.

Before starting, read the project's `CLAUDE.md` and `../../references/stack-guidelines.md` (version traps). In a project not made from the template, read `references/outside-template.md` first. Before following a companion skill, read its entry in `../../references/companions.md`. Under `develop`'s Workflow A, take the default instead of asking (no design: the current theme; a new font: keep Geist; a palette change: apply it; a structural gap: step 3's mobile rules) and record it under **Design gaps**.

Paths and commands below are the app folder's (`apps/web` in a project from the boilerplate). From the monorepo root, as under `develop`'s Workflow A, `pnpm lint:fix` and `pnpm check` work as written; the app's own commands take `--filter web` (`pnpm --filter web exec shadcn add <name>`, `pnpm --filter web test <path> --coverage.enabled=false`), since the root scripts run turbo, which rejects their flags.

## 0. Get the design

Use every source present; look before asking:

- **`DESIGN.md`:** the path the request names, else `DESIGN.md` or `design/DESIGN.md`, when it describes the look (colors, type, spacing, radius, components). Read it fully; its written values win over measured ones, and each conflict goes under **Design gaps**.
- **Images:** read each with the Read tool; note every frame and its width. Exports are often @2x: halve values measured from them.
- **Figma link:** find the Figma MCP tools (ToolSearch `figma` when deferred). Take each frame's screenshot as the target and the design context for exact values; its generated code (absolute positions, raw hex) is a spec to read, not code to paste. Without the tools, ask for a PNG export per frame and breakpoint; a fetched Figma page renders nothing usable.
- **None:** ask once: "Do you have a DESIGN.md or a Figma link for this? Both are optional; without them I use the app's current theme." With neither, keep the theme, skip step 2's value changes, and record "no design given: current theme".

Then list what the design leaves out (loading, error and empty states, the other screen width, hover / focus / disabled, dark mode, long text) under **Design gaps**. Ask only when a missing piece changes structure (what a 5-column table becomes on a phone).

## 1. Inventory

Split the design into regions (shell, header, toolbar, list, card, form) and map each to what exists: `packages/ui/src/components/` (`@repo/ui/components/<name>`), `src/components/`, then `src/features/*/components/`. The shell is `src/app/root-layout.tsx`. Elements to components, and icons to lucide: `references/design-mapping.md`. A missing shadcn component (style `radix-nova`; the boilerplate ships `alert badge button card field input label separator skeleton sonner`) comes from `pnpm exec shadcn add <name>` in `apps/web`, which writes into `packages/ui`. A look no variant provides is a small app component that wraps the shadcn one; `packages/ui/src/components/` is generated and stays untouched. Done when every region has its component written down: this list is the plan and the report.

## 2. Tokens

Tailwind 4 is CSS-first: the theme lives in `packages/ui/src/styles/globals.css` (values in `:root` / `.dark`, exposed by `@theme inline`; `apps/web/src/styles/index.css` only imports it), and there is no `tailwind.config.js`. Follow `references/design-mapping.md`:

- Map each design color by role, and edit the **values** in `:root`, so every component, focus ring and toast follows. Keep the design's value as given (hex is valid there).
- A role the theme lacks (success, warning) gets a new variable, its `@theme inline` line and a `-foreground` pair.
- Components use tokens only (`bg-primary`, `text-muted-foreground`) and `cn` from `@repo/ui/lib/utils`; raw colors and palette classes bypass the theme.
- Ask first: a new font (a `@fontsource` dependency; keep Geist meanwhile), and a palette change that would restyle screens the design does not cover.
- Dark mode is not wired; `references/design-mapping.md`, Dark mode, says what to do when the design shows one.

## 3. Build

- Flex and grid with `gap-*`; absolute positioning only for overlays. Frame widths become `max-w-*` or responsive widths.
- Mobile-first: base classes for the narrow layout, `sm:` / `md:` / `lg:` for wider. A desktop-only design collapses below `sm:` (columns stack, side nav moves on top, wide tables stack or scroll), noted as an assumption.
- Semantic HTML inside the layout's `header` / `nav` / `main`: a page uses `section` / `article`, `ul` / `li` for lists, one `h1` and ordered headings. `CardTitle` renders a `div`, so a card that names a section puts the heading inside it: `<CardTitle><h3>{title}</h3></CardTitle>`.
- Data screens render the four states (`../feature-development/references/ui-states.md`), styled to the design: skeletons shaped like its rows, the empty state with the next action.
- Spacing and type round to the 4px rhythm and type scale; an intentional off-scale value goes under **Design gaps**, as does low-contrast text (the token stays).
- Keep shadcn's hover, `focus-visible` and `disabled` styles.
- Data, forms and endpoints follow `feature-development` and `api-integration` (forms: `../feature-development/references/forms.md`). A new page gets its route factory, its entry in `src/app/routes.tsx` and a nav `Link` from `react-router` before tests and the visual check.

## 4. Tests

React Testing Library by role and label for what the design shows: headings, landmarks, lists, buttons, labels. Every new component gets its own folder (`components/<Name>/index.tsx`, `../feature-development/references/feature-layout.md`) and its own test in that folder's `__tests__/` with `renderWithProviders`; the page test (`renderRoute`) covers how the parts work together; data screens test the four states (`../feature-development/references/testing.md`). Behaviour is asserted, not class names or colors.

## 5. Visual check

Follow `references/visual-check.md`: with a browser tool, compare the page with the design region by region and fix, at most 3 rounds. With only a `DESIGN.md`, check its colors, type and spacing show; with no design, check the page at desktop width and 375px. Without a browser tool, record "visual check not done" under **Not done**.

## 6. Gates

`pnpm lint:fix`, then `pnpm check`, each as a plain command with no pipe or redirect. In a project from the boilerplate, run `pnpm -w check:report` instead of `pnpm check`: the same gates, run at the workspace root from any folder of it, ending with the checklist (each gate, the unit and e2e pass rates, line coverage) that goes in the Result. Fix the cause until green; a rule, a type and an assertion stay as strict as they are. If it stops at the e2e gate with "Executable doesn't exist", Chromium is missing on this machine: run `pnpm test:e2e:install` once, then the same gate command again (`pnpm -w check:report` in a project from the boilerplate).

## Result

```
## Result
**Did:** what was built (files, components added with the CLI, tokens changed, tests) and the `pnpm check` outcome (in a project from the boilerplate, the `check:report` checklist)
**Saw:** facts observed (design frames read, existing components reused, visual-check findings, code/doc mismatches)
**Not done:** anything skipped, including "visual check not done" when no browser tool was available, and remaining visual differences
**Blocked by:** unanswered questions (a new font dependency, a global palette change, a missing asset)
**Next:** what the user should answer or do
**Design gaps:** what the design did not specify and what was assumed: states, mobile layout, interaction states, icons substituted, values rounded or arbitrary
```

When `feature-development` loaded this skill, or under `develop`'s Workflow A or B, that Result carries the **Design gaps** line instead.

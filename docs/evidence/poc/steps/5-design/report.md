I restyled the shell, dashboard and tasks page to match the two designs. `pnpm check` passes, but I haven't compared the result with the PNGs in a browser. The brand colors are also estimates, because I couldn't read exact pixel values from the PNGs.

## Result
**Did:**
- **Colors and radius** (`src/styles/index.css`):
  - Set `:root` brand colors by role: indigo primary, tinted page background, white cards, muted track, destructive red, matching border, input and ring.
  - Added new roles `warning`, `success` and `priority-high`/`-medium`/`-low`, wired through `@theme inline`.
  - Raised `--radius` to `0.7rem`.
- **Shell** (`root-layout.tsx`): white header with the indigo logo mark, `NavLink` tabs with an active underline, and a wider content column.
- **Dashboard:**
  - Four stat cards: Total tasks, In progress, Done, and Overdue in red.
  - A Completion card showing "2 of 8 done · 25%" with a thicker progress bar.
  - A "Due soon" card with "Next 7 days", "Due Oct 22" dates and status badges. Loading, error and empty states render inside the same card.
- **Tasks page:**
  - A "New task" card with a Title / Priority / Due date row, a Description box and an Add task button with a plus icon.
  - A segmented status filter and a search field with an icon.
  - Task rows with a priority dot, "Overdue · Oct 17" in bold red, and the status select styled as a colored pill.
- **New files:** `task-status-badge.tsx` with its test and story, and `formatDueDate` in `dates.ts` with a test.
- **Tests:** I updated the ones that asserted the old structure (stat labels, status select, "Priority:" text, the "Overdue" badge).
- **Gates:** `pnpm check` passes (lint, typecheck, tests, build, Storybook build).

**Saw:**
- The dashboard, tasks page and shell already existed, so this was a restyle rather than new screens.
- Both designs are drawn at 1280px wide.
- Two label differences from the app: the design says "Description" and "Due date" without "(optional)". I kept "(optional)" as screen-reader-only text so the accessible names and existing tests still work.

**Not done:**
- **Visual check:** there is no browser tool in this session, so I never compared the running app with the PNGs. Remaining pixel differences are unknown.
- **Colors:** pixel sampling was denied, so I estimated each hex value by eye from the PNGs. Treat them as approximate and replace them with exact values if you have them.

**Blocked by:** nothing.

**Next:**
- Run `VITE_API_MOCKING=true pnpm dev` and compare both pages with the designs.
- Send the exact brand hex values if my estimates look off; they are all in `:root` in `index.css`.

**Design gaps:**
- **Mobile:** the designs show desktop only. Below `sm` the stat cards go two per row, the form and task rows stack, and the filters stack.
- **Dark mode:** not shown, so the `.dark` tokens are untouched, and dark mode isn't active in the app anyway.
- **Due date field:** the design shows a text placeholder `yyyy-mm-dd`. I kept the native date input, which works better and keeps the existing tests.
- **Priority control:** it is a native select, so its open dropdown uses browser styling.
- **Dashboard stats:** the design shows four, so "To do" and "Due this week" are no longer displayed.
- **"Your tasks" heading:** the design has none, so I removed it.
- **Icons and fonts:** lucide `PlusIcon` and `SearchIcon` stand in for the design's glyphs. The design's font looks like a system sans, so I kept Geist.
- **Card radius:** it follows the app's derived scale (about 1.4× the control radius), so it may differ from the design by a couple of pixels.

<!-- session: success, turns 81, cost $0.98, duration 5.2 min -->

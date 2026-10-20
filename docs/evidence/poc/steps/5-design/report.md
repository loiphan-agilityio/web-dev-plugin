The dashboard and tasks page now follow the two designs, and `pnpm check` passes. That covers lint, typecheck, 135 tests, build and the Storybook build. I did not open the app in a browser, so I never compared it against the PNGs side by side.

## Result
**Did:**
- **Brand colors (`src/styles/index.css`):**
  - Mapped by role: primary indigo, a soft gray page background, white cards, muted and border grays, a red for destructive, and a radius of 0.75rem.
  - Added tokens for the status pills and the medium-priority dot: success, warning and warning-indicator.
- **Header (`root-layout.tsx`):** logo square, `NavLink` tabs with an active underline, content width 1024px.
- **Dashboard:**
  - Four stat cards (Total tasks, In progress, Done, Overdue in red).
  - A Completion card with the "2 of 8 done · 25%" text and a thicker progress bar.
  - A Due soon card with "Next 7 days", "Due Oct 22" dates and status pills.
  - I dropped the To do and Due this week cards and the "Where your work stands" heading, because the design doesn't show them.
- **Tasks page:**
  - "New task" card with the title, priority and due date row plus the description and a "+ Add task" button.
  - Status filter as a pill-style toggle group with a search box.
  - Rows with the description, a priority dot, a "Due Oct 22" or red "Overdue · Oct 17" date, and the status as a colored select. Changing the status in place still works.
- **New files:** `status-badge.tsx`, `status-classes.ts` and a `formatDueDate` helper in `filters.ts`.
- **Tests and stories:** I updated the affected tests, since the status filter is now buttons instead of a select and several labels and dates changed. I added a test and a story for `StatusBadge`.

**Saw:** `design/` has only the dashboard and tasks frames, both at 1280px wide and drawn at 1x. The design shows only the loaded state, so the loading, error and empty states keep their existing behavior, restyled to fit.

**Not done:**
- The visual check, because no browser tool was available.
- The brand colors are eyeballed from the PNGs, not sampled. Reading pixels needed a Python or .NET command that was blocked here. Primary is `#3347c9`, and the rest are close guesses.

**Blocked by:** nothing.

**Next:**
- Open the app with `pnpm dev:mock` and compare it to the PNGs.
- If you have exact brand hex values, change them in the `:root` block of `src/styles/index.css`. That is the only place they live.

**Design gaps:**
- No mobile layout in the design. Below `md`, the form fields stack, task rows wrap, and the stat cards sit two per row.
- The page-wide palette change also restyles the task detail page, which has no design.
- Dark mode is not shown or wired, so `.dark` tokens are unchanged.
- The font is still Geist; the design looks like a system sans, and a different font would need a new dependency.
- The Priority field is a native select, so its dropdown chevron is the icon. The design shows a "▾" glyph.
- The search icon is lucide `SearchIcon`.
- Hover and focus states are the existing shadcn ones.
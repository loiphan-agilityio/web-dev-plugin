# Outside the template

For a project `develop` sorted as `same-stack` or `other-stack` (its Workflow B), with the project map it passes. The theme, the component kit and the layout live where the map found them, and the project's conventions win over the skill's.

- **Still holds:** the design is a visual target, never an image in the app; design values go in the project's one theme source (CSS variables, `tailwind.config.js` on Tailwind 3, a MUI or Chakra theme), mapped by role, with tokens in components where the project has them; four distinct states on data screens; semantic HTML and focus styles; tests by role and label; the visual check; **Design gaps** in the Result.
- **Template-only, skipped here:** `src/styles/index.css` and `@theme inline`, `pnpm exec shadcn add` and `radix-nova` (only with a `components.json`), `cn` from `@repo/ui/lib/utils`, `@/test/render`, `src/app/root-layout.tsx` (the map names the layout file), and lucide (the project's icon set applies).
- **New libraries** (a UI kit, an icon set, a font) are a question for the user.
- **Gates:** skip them here. `develop` runs `verify-project.sh` once over the whole suite after the change (Workflow B, step 5), and reports.

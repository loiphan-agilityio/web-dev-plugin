# Eval results — 2026-10-18

Headless Claude Code 2.1.301 sessions, model Sonnet 5.5, effort medium, one temp project per
run, graded by `evals/grade.sh` (no model involved). Prompts are in `evals/prompts/`.

## End-to-end evals

| Eval | Config | Skill invoked | Gates (lint, typecheck, test, build) | Checks | Forbidden patterns | Turns | Cost |
|---|---|---|---|---|---|---|---|
| skeleton | full | `code-skeleton` | pass | 6/6 | 0 | 6 | $0.09 |
| feature (NOTES-12) | full | `develop-feature` | pass | 14/14 | 0 | 32 | $0.42 |
| api (toggle + delete + 404) | full | `integrate-api` | pass | 8/8 | 0 | 42 | $0.53 |
| feature | skills only | `develop-feature` | pass | 14/14 | 0 | 26 | $0.39 |
| api | skills only | `integrate-api` | pass | 8/8 | 0 | 62 | $0.74 |
| feature | none (template, no skills) | — (tried `develop-feature`, not installed) | pass | 14/14 | 0 | 31 | $0.46 |
| skeleton from scratch | none (empty dir, stack in prompt) | — | pass* | — | 0 | 21 | $0.42 |

`full` = the three skills + the 8 companions; `skills only` = no companions. \*The from-scratch
project has no `pnpm check` script; its four gates were run one by one and all pass.

**Trigger check** (`evals/trigger-check.sh`): 7/7. Four unrelated prompts invoked no skill; three
prompts phrased differently from the descriptions invoked the right one. Cost $0.46.

**Total eval spend: ≈ $4.20.**

## What the evals found and fixed

- **`.claude/` was linted and tested.** With the skills installed in the project (the normal
  setup), ESLint and Vitest picked up the skill template and the todos example under
  `.claude/skills/` and `pnpm check` failed. The first feature run reported this honestly
  instead of editing config outside the ticket. Fixed in the template; `verify.sh` now installs
  the skills inside the temp project so it stays covered.
- The runner's narrow `Bash(pnpm *)` allow-list blocked compound shell commands in the first
  from-scratch baseline; it was rerun with `EVAL_PERMISSION_MODE=auto`.

## What the comparison shows

- **The template + `CLAUDE.md` + lint guardrails carry most of the convention.** A feature run
  with no skills installed, but inside a scaffolded project, still passed 14/14: it read
  `CLAUDE.md` and the existing code. The skills add the workflow (acceptance criteria, scope
  exclusions, the test checklist, the Result report) and the reference example.
- **Without the skeleton, Sonnet 5.5 can still scaffold a green app** when it looks versions up
  live. What it does not produce: the team layout, `CLAUDE.md` for later sessions, the ESLint
  rules that reject version mistakes, typed errors beyond a generic `HttpStatusError`
  (3 classes vs 7, untested), lazy routes (544 kB bundle warning), CLI-generated shadcn
  components (it hand-wrote four) or the companion skills. It took 3.5× the turns and 4.7× the
  cost of `code-skeleton`, and its structure is whatever that run chose.
- **Companions did not change pass rates** (full vs skills-only both 100%). They are there for
  questions the project skills do not cover (Vite config, shadcn composition, React performance).

## Not covered

- MSW in a real browser (`VITE_API_MOCKING=true pnpm dev`) was smoke-tested at the HTTP level
  only (dev server, worker script and mocking import served); not driven in a browser.
- One run per configuration: no variance measurement.

## Design eval and four-skill trigger check — 2026-10-19

Same setup (Sonnet 5.5, effort medium, `skills` config = the four project skills, no companions).
The `design` eval is NOTES-12 plus `design/notes.png` (`evals/fixtures/designs/`: indigo brand
color, a textarea and a badge the template does not ship, success state only). `grade.sh` adds 5
checks for it: no raw colors in `src/`, `components/ui` not modified, `--primary` changed,
lucide-react used, `design-to-ui` loaded.

| Eval | Config | Skills invoked | Gates | Checks | Forbidden patterns | Turns | Cost |
|---|---|---|---|---|---|---|---|
| design, run 1 | skills | `develop-feature` | pass | 18/19 | 0 | 34 | $0.62 |
| feature (regression) | skills | `develop-feature` | pass | 14/14 | 0 | 28 | $0.46 |
| design, run 2 (after fix) | skills | `develop-feature`, `design-to-ui` | FAIL* | 18/19 | 0 | 37 | $0.52 |

\*Run 2 made one compound shell call (`D=…; cat …`), the runner's `Bash(pnpm *)` allow-list
denied it, and the model concluded the shell was off for the whole session, so it never ran
`pnpm check`. The gate failure is one unused import that `pnpm check` would have caught. The same
runner limitation is noted in the first section above.

**Trigger check** (`evals/trigger-check.sh`, now 12 prompts): 12/12. The three design prompts
(a PNG path, a mockup path, a Figma URL) invoked `design-to-ui`; a ticket that comes with a design
invoked `develop-feature`; "Make the app look nicer." invoked nothing. Cost $1.90.

**Spend for this section: ≈ $3.50** (total with the first section ≈ $7.70).

What the runs showed:

- **Run 1: the design was followed but the skill was not loaded.** `develop-feature` said "follow
  the `design-to-ui` skill" and the model treated it as advice. The output still met every design
  check: brand values went into `:root` as hex, no raw colors in components, lucide `PlusIcon`, a
  **Design gaps** list, and "visual check not done" under Not done. Fixed by having
  `develop-feature` say "invoke the `design-to-ui` skill (Skill tool) before writing UI code".
  Run 2 loaded it right after reading the design.
- **Missing shadcn components when the CLI cannot run.** In both runs the shell denial blocked
  `pnpm dlx shadcn@latest add textarea`. Run 1 hand-wrote `src/components/ui/textarea.tsx`. Run 2,
  with `design-to-ui` loaded, put it in `src/components/textarea.tsx` and left `components/ui`
  alone. Both reported it and told the user to re-add it with the CLI.
- **Ticket vs design conflicts are reported, not guessed.** Both runs left out the design's
  "Saved" badge, because the ticket has no field for it, and listed the question under Blocked by.
- **`feature` did not regress** and did not invoke `design-to-ui`.

## Not covered (design)

- **Browser visual check.** Headless runs have no Claude in Chrome, so the loop in
  `design-to-ui/references/visual-check.md` (new tab, screenshots at 1280 and 375px, at most 3 fix
  rounds) was not exercised. It needs one manual run in an interactive session with Chrome
  connected.
- **A green design run after the fix.** Run 2 loaded the skill and passed all 18 content checks,
  but its gates failed for the runner reason above.

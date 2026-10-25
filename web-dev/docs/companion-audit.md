# Companion skills audit — 2026-10-18

Source for `install-companions.sh`, the README table and `references/companions.md` (the
overrides the skills read). Audited at the SHAs below by two read-only auditor agents; every file in each skill
directory was read (except two PNGs in shadcn). No skill was installed during the audit.

Install form: `npx -y skills@1.7.2 add https://github.com/<repo>/tree/<sha>/<path> -a claude-code -y`

The installer is pinned as well: `skills@1.7.2` (published 2026-10-09, the release current at the
audit) supports `add <url>/tree/<sha>/<path>`, `-a claude-code` and `-y`, has no install scripts,
and needs Node >= 22.20. Upgrading it follows the same rule as a companion (the repository's `CLAUDE.md`):
read the changelog, then change the version everywhere that rule lists.

## Pinned companions

| Skill (name after install) | Repo @ SHA | Path | License | Verdict |
|---|---|---|---|---|
| `shadcn` | shadcn-ui/ui @ `d2fba50ee5b9113008b5bb908563527b7efd2f27` | skills/shadcn | MIT | pin, with override note |
| `react-router-data-mode` | remix-run/agent-skills @ `33578aae4aa36a90c9f8f602105a1ccb0f4efe45` | skills/react-router-data-mode | MIT | pin, with override note |
| `vite` | antfu/skills @ `feb0f3aba6566426f12230e7fc7a10d97c1293bb` | skills/vite | MIT | pin |
| `vitest` | antfu/skills @ `feb0f3aba6566426f12230e7fc7a10d97c1293bb` | skills/vitest | MIT | pin, with override note |
| `vercel-react-best-practices` | vercel-labs/agent-skills @ `063bee94c3f4df8453406c830b0a7df0f2860278` | skills/react-best-practices | MIT (frontmatter) | pin, with override note |
| `vercel-composition-patterns` | vercel-labs/agent-skills @ `063bee94c3f4df8453406c830b0a7df0f2860278` | skills/composition-patterns | MIT (frontmatter) | pin |
| `react-hook-form` | pproenca/dot-skills @ `cf93c57cac89d6fc3e4194686000411567f5caf3` | skills/.curated/react-hook-form | MIT | pin, with override note |
| `react-testing` | affaan-m/ecc @ `76aaa77df6adc5b889e689007bf99b9a4f74af34` | skills/react-testing | MIT | pin, with override note |

## Moved out of the companion set

| Skill | Why | Now |
|---|---|---|
| `tanstack-query-best-practices` (deckardger/tanstack-agent-skills @ `b2fc14c9`) | Principles agree with ours (key factories, `queryOptions`, `isPending`, targeted invalidation), but nearly every example contradicts the stack: raw `fetch`/axios `queryFn`, `error.message` instead of a TaggedError union, `isLoading`, Suspense-first, TanStack Router loader signatures, and a large SSR/Next section. Installed, it would pull generated code away from the convention in most files it touches. | Authoring source only. `api-integration/references/react-query.md` carries the principles. |

## Security notes

- **shadcn** `SKILL.md:5` pre-approves `Bash(npx|pnpm dlx|bunx --bun shadcn@latest *)`, and
  `SKILL.md:17` runs `` !`npx shadcn@latest info --json` `` automatically when the skill
  loads. That executes whatever npm serves as `shadcn@latest` at that moment. Mitigated:
  `install-companions.sh` rewrites every `shadcn@latest` to `pnpm exec shadcn`, the CLI pinned
  by the project's lockfile, and exits 1 if any `shadcn@latest` is left after the rewrite.
- No other skill has `allowed-tools`, install scripts, network calls or credential access.

## Override notes

The overrides themselves live in one place, [`../references/companions.md`](../references/companions.md),
which every skill reads before following a companion. The audit found them at these lines of the
pinned commits:

- `shadcn`: the Tailwind v3 branch (`SKILL.md:156`, `customization.md:111-121`) and `next-themes`
  (`customization.md:52-55`); its RSC notes are inert on Vite (`isRSC` is false).
- `react-router-data-mode`: `unstable_MiddlewareContext` (`route-object.md:231-236`).
- `vitest`: `vi.stubGlobal('fetch')` and `vi.mock` of API modules (`features-mocking.md:102,154,240`).
- `react-hook-form`: `integ-shadcn-form-import` and `integ-shadcn-select-wiring` (the old shadcn
  `Form` / `FormField`).
- `react-testing`: dead cross-references to `rules/react/testing.md`, other skills, agents and
  commands.

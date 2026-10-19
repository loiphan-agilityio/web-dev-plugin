# Companion skills audit — 2026-10-18

Source for `install-companions.sh`, the README table and every skill's `## Related skills`
section. Audited at the SHAs below by two read-only auditor agents; every file in each skill
directory was read (except two PNGs in shadcn). No skill was installed during the audit.

Install form: `npx skills add https://github.com/<repo>/tree/<sha>/<path> -a claude-code -y`

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
| `tanstack-query-best-practices` (deckardger/tanstack-agent-skills @ `b2fc14c9`) | Principles agree with ours (key factories, `queryOptions`, `isPending`, targeted invalidation), but nearly every example contradicts the stack: raw `fetch`/axios `queryFn`, `error.message` instead of a TaggedError union, `isLoading`, Suspense-first, TanStack Router loader signatures, and a large SSR/Next section. Installed, it would pull generated code away from the convention in most files it touches. | Authoring source only. `integrate-api/references/react-query.md` carries the principles. |

## Security notes

- **shadcn** `SKILL.md:5` pre-approves `Bash(npx|pnpm dlx|bunx --bun shadcn@latest *)`, and
  `SKILL.md:17` runs `` !`npx shadcn@latest info --json` `` automatically when the skill
  loads. That executes whatever npm serves as `shadcn@latest` at that moment. Accepted
  knowingly: it is the official CLI the project uses to add components anyway. Documented in
  the README so teams can strip line 17 if their policy forbids unpinned execution.
- No other skill has `allowed-tools`, install scripts, network calls or credential access.

## Override notes (what each skill must tell Claude to ignore or replace)

**shadcn**: ignore the Tailwind v3 / `tailwind.config.js` branch (`SKILL.md:156`,
`customization.md:111-121`), the RSC `"use client"` notes (inert on Vite: `isRSC` is false),
and `next-themes` (`customization.md:52-55`). Forms (`FieldGroup` + `Field`,
`data-invalid` / `aria-invalid`) match the convention.

**react-router-data-mode**: written for v7. On React Router 8, import DOM-only APIs as the
installed package requires (see the template), there is no `react-router-dom`, and
`hasErrorBoundary` is gone. Loaders and `useLoaderData` are its primary data path, and
`useFetcher` its mutation path. Ours is TanStack Query: loaders only prefetch with
`queryClient.ensureQueryData`, and mutations go through `useMutation` + React Hook Form.
Ignore `references/ssr.md` and `unstable_MiddlewareContext` (`route-object.md:231-236`).

**vitest**: mock the network with MSW, never `vi.stubGlobal('fetch')` or `vi.mock` of API
modules (`features-mocking.md:102,154,240`). Use pnpm, not npm. Use Effect Schema, not zod, in
`expect.schemaMatching` (via `Schema.toStandardSchemaV1`). Browser Mode is not used.

**vercel-react-best-practices**: skip every `server-*` rule, plus `async-api-routes`,
`async-suspense-boundaries`, `rendering-hydration-*`, `rendering-resource-hints` and
`rendering-script-defer-async`. Replace `next/dynamic` with `React.lazy` / dynamic `import()`,
`optimizePackageImports` with direct imports, and SWR (`client-swr-dedup`,
`client-event-listeners`) with TanStack Query. Raw `fetch`/Promise examples
(`async-parallel`, `async-defer-await`) become Effect (`Effect.all` with `concurrency`). The
`rerender-*`, `js-*`, `advanced-*` and most `bundle-*` rules apply as written.

**vercel-composition-patterns**: examples use React Native `<TextInput>`; adapt to DOM and
shadcn. No conflicts.

**react-hook-form**: every resolver example is `zodResolver` → use
`standardSchemaResolver(Schema.toStandardSchemaV1(schema))`. Skip `integ-shadcn-form-import`
and `integ-shadcn-select-wiring` (old shadcn `Form` / `FormField`); we use `Field`. Raw
`fetch` + `setError('root.serverError')` becomes the `ValidationError.fields` → `setError`
mapping; `useQuery({ queryFn: fetchX })` becomes `queryOptions` via `runEffect`.

**react-testing**: Vitest only (ignore the Jest table, `jest.config.js`, `jest.mock`); use
`vitest-axe` if axe is wanted. Its MSW snippets import `http` / `HttpResponse` from `msw`
(v2 style): on MSW 3 they come from `msw/http`. Its `renderWithProviders` uses `MemoryRouter`
+ a theme provider; ours is in `src/test/render.tsx`. First load is `isPending`. Its
cross-references to `rules/react/testing.md`, other skills, agents and commands are dead links.

---
name: security
description: This skill should be used when the user asks to "check security headers", "add a Content Security Policy", "security review of the frontend", "check for XSS", "audit dependencies", "harden the deploy" or "apply web best practices" in a web app, or when the web-quality audit routes a security or best-practices finding here. It checks what the deployed page sends, the dependencies' advisories and the frontend code's risky patterns (XSS sinks, open redirects, token storage, secrets in the bundle), then fixes them in a React + Vite app. Not a penetration test and not a backend review.
compatibility: "Claude Code, as part of the web-quality plugin: reads the plugin's references/ and scripts/. Needs Node 22 or newer; the header checks need a deployed URL or a preview."
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/../../scripts/check-headers.mjs *) Bash(pnpm audit) Bash(pnpm audit --prod) Bash(pnpm check) Bash(pnpm update *)
---

# security

Close the gaps a web frontend controls: what the host sends, what the dependencies carry, and what
the code does with untrusted data. Headers and the policy: `references/headers-csp.md`.

This is a frontend review. Authentication, authorization, CORS, rate limits and cookie flags are
the backend's; name them under **Not checked** when they matter.

## 1. Measure

1. **Headers on the real host:** `node ${CLAUDE_SKILL_DIR}/../../scripts/check-headers.mjs <url>` on
   production and on a preview deploy (they can differ: `references/headers-csp.md`). Without a
   deployed URL, read the host config (the boilerplate's `apps/web/public/_headers` for Cloudflare
   Pages, `netlify.toml`, `vercel.json`) and mark findings **config**.
2. **Dependencies:** `pnpm audit --prod` for what ships, then `pnpm audit` for the toolchain.
   For each advisory: is the vulnerable code reachable (a dev-only CLI is not shipped), is a patched
   version within the declared range, does an override fix it.
3. **Code** (search the source, not `node_modules`), each a lead to read in context:

| Pattern | Risk | Safe form |
|---|---|---|
| `dangerouslySetInnerHTML`, `.innerHTML =`, `insertAdjacentHTML` | XSS from untrusted HTML | render text; sanitize with a maintained sanitizer when markup must stay |
| `eval(`, `new Function(`, `setTimeout("…")` | code injection, needs `'unsafe-eval'` | data, not code |
| `href={` or `src={` built from user or API data | `javascript:` URLs | allow only `https:`, `mailto:` and relative URLs |
| a redirect target from the URL (`?redirect=`, `next`, `returnTo`) | open redirect | resolve on this origin and reject `//host`: the boilerplate's auth feature does it in `safeRedirect` (`src/features/auth/model.ts`) |
| a token in `localStorage` | readable by any injected script | an httpOnly cookie set by the backend; until then, a strict CSP |
| a secret in a `VITE_*` variable | Vite inlines it into the public bundle | keep secrets on the server; `VITE_*` is public |
| `target="_blank"` to another site with `rel` removing `noopener` | the opened page controls this tab | leave `rel` at its default or add `noopener` |

Then grep the built `dist/` for anything that looks like a key or an internal URL.

## 2. Fix

- Headers and CSP: `references/headers-csp.md`. Start report-only when tightening a live policy.
- Dependencies: update within the range (`pnpm update <name>`), add an override for a transitive
  fix with a comment saying why and when to drop it, move build-only tools to `devDependencies`, and
  turn on Dependabot (a project from the boilerplate has `.github/dependabot.yml`).
- Code: the safe forms above. Keep a fix minimal and add a test for the case it closes (an input
  with `javascript:`, a `//evil.example` redirect).
- In a project from the boilerplate, `pnpm check` stays green after each fix.

## 3. Confirm

Re-run `check-headers.mjs` on the preview deploy of the fix, `pnpm audit --prod`, and load the main
pages with the console open: no CSP violation.

## Result

Header checks before → after, advisories (package, severity, reachable or not, how fixed), code
findings (file: line, risk, fix), and **Not checked** (backend, auth flows, infrastructure).

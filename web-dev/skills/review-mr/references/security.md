# Security pass

What `review-mr` checks on every changed line of a merge or pull request. Each row is a lead: read
the code around it (`git show FETCH_HEAD:<path>`) before writing the comment, and comment only when
untrusted data can really reach the risky place, or the rule is really broken.

The code patterns come from web-quality's `security` skill, which checks the same things across a
whole app; the diff-only rows are what a reviewer sees that a scan of the finished app does not.

## Code patterns

| Pattern in the diff | Risk | What the comment asks for |
|---|---|---|
| `dangerouslySetInnerHTML`, `.innerHTML =`, `insertAdjacentHTML` | XSS from untrusted HTML | render text; sanitize with a maintained sanitizer when markup must stay |
| `eval(`, `new Function(`, `setTimeout("…")` | code injection, and a CSP that must allow `'unsafe-eval'` | data, not code |
| `href={` or `src={` built from user or API data | `javascript:` URLs | allow only `https:`, `mailto:` and relative URLs |
| a redirect target from the URL (`?redirect=`, `next`, `returnTo`) | open redirect | resolve it on this origin and reject `//host`; a project from the boilerplate has `safeRedirect` in `src/features/auth/model.ts` |
| a token written to `localStorage` or `sessionStorage` | readable by any injected script | an httpOnly cookie set by the backend; until then, a strict CSP |
| a secret in a `VITE_*` variable | Vite inlines it into the public bundle | keep it on the server; every `VITE_*` value is public |
| `target="_blank"` to another site with a `rel` that drops `noopener` | the opened page controls this tab | leave `rel` at its default or add `noopener` |

## Only a diff shows

| Change | Risk | What the comment asks for |
|---|---|---|
| a key, token, password or private URL written in the code, a fixture or a config file | the secret is exposed in the branch history | never quote the value; rotate it, then load it from the server or the CI secret store (the SKILL's secret rule) |
| a dependency added or its version range changed in `package.json` | supply chain, a known advisory | name the package and ask why; no audit is run here (`pnpm audit` belongs to web-quality's `security`) |
| `public/_headers`, a CSP or another security header loosened or removed | the browser stops blocking injected scripts, framing or sniffing | keep the header; widen the one directive the change needs, with a reason |
| auth, session or redirect code changed with no test for the hostile case | a regression nobody sees | a test with the hostile input (`//evil.example`, `javascript:alert(1)`, an expired token) |
| a check of who may do what moved to the client only (a hidden button, a route guard) | the API still allows it | the server enforces it; the client check is only presentation |

## Out of scope

Authorization, CORS, cookie flags and rate limits are the backend's; live response headers need a
deployed URL and advisories need an installed project. When the change touches them, write one
line under **Not done** and point to web-quality's `security` skill or the backend's own review.

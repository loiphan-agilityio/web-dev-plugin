# Security pass

What `review-mr` checks on every changed line of a merge or pull request: web code, and the server
code that lives in the same repository. Each row is a lead: read
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
| a key, token, password or private URL written in the code, a fixture or a config file | the secret is exposed in the branch history | never quote the value, in a comment or in the summary; rotate it, then load it from the server or the CI secret store (the SKILL's secret rule) |
| a secret (`secrets.*`, a secret-holding environment) used in a workflow that runs on `push` or `pull_request` | every pushed branch runs its own copy of that file, so any branch can read the secret | secrets only in workflows whose trigger runs the default branch's copy (`workflow_run`, `repository_dispatch`, `schedule`) and execute nothing from the branch, or in an environment limited to protected branches |
| a dependency added or its version range changed in `package.json` | supply chain, a known advisory | name the package and ask why; no audit is run here (`pnpm audit` belongs to web-quality's `security`) |
| `public/_headers`, a CSP or another security header loosened or removed | the browser stops blocking injected scripts, framing or sniffing | keep the header; widen the one directive the change needs, with a reason |
| auth, session or redirect code changed with no test for the hostile case | a regression nobody sees | a test with the hostile input (`//evil.example`, `javascript:alert(1)`, an expired token) |
| a check of who may do what moved to the client only (a hidden button, a route guard) | the API still allows it | the server enforces it; the client check is only presentation |
| a third-party GitHub Action referenced by tag or branch (`uses: owner/action@v4`) instead of a full commit SHA | the tag can be moved to malicious code that then runs with the workflow's secrets | pin to the full commit SHA, with the version in a comment |
| a workflow on `pull_request_target`, or one that checks out the branch's code (`ref: ${{ github.event.pull_request.head.sha }}`) and runs it (install, build, test scripts) with secrets or a write token | code from the merge request runs with the base repository's privileges | run branch code only in a `pull_request` workflow with no secrets; keep `pull_request_target` for jobs that execute nothing from the branch |
| `pnpm-lock.yaml` changed with no matching `package.json` change, or a `package.json` change with no lockfile change | a dependency resolved to something the manifest does not show, or an install that fails in CI | regenerate the lockfile with the package manager and commit both; ask why when the lockfile alone changed |
| the same dependency declared in two or more workspace packages with its own version, not the workspace catalog | the packages drift to different versions, and a fix reaches only one | declare it once in the workspace catalog (`pnpm-workspace.yaml`) and reference it with `catalog:` |

## Server code in the same repository

When the diff touches backend code that lives in this repository (an API, a Worker, server or edge
functions, a proxy), review it with these rows as well. Read the whole handler and the middleware
chain it sits in (`git show FETCH_HEAD:<path>`) before commenting: a check may live one layer up.

| Pattern in the diff | Risk | What the comment asks for |
|---|---|---|
| a route registered where the auth middleware or session check does not run (a new router mounted before it, a path added to the public list) | anyone can call it without signing in | put it behind the same authentication as its neighbours; list a route as public only with a reason |
| a handler that loads or changes a record by an id from the request without checking the caller may access it | IDOR: any signed-in user reads or changes another user's data | check ownership or membership of that resource on the server, and answer 404 or 403 when it fails |
| a request body, query, path parameter or header used without being decoded with a schema at the boundary | wrong types and unexpected fields reach the logic and the database | decode with the project's schema library at the handler's entry and reject on failure with a 4xx |
| SQL built by string concatenation or a template literal with request data | SQL injection | bound parameters (D1 `.bind(...)`), never interpolation |
| a session or refresh cookie set without `HttpOnly`, `Secure` or `SameSite`, or with a wider `Domain` or `Path` than before; refresh-token rotation or reuse detection weakened | the cookie is readable by script or sent to other sites and paths; a stolen refresh token keeps working | restore the flags and the narrow scope; keep rotation and revoke the token family on reuse |
| a CORS `Access-Control-Allow-Origin` echoing the request's `Origin`, or `*` together with credentials | any site can make credentialed calls and read the answers | an allow-list of exact origins; no `*` with credentials |
| a shared secret, signature or token compared with `===` or `==` | a timing difference leaks the value | a constant-time comparison from the platform's crypto library |
| a webhook handler that parses or acts on the event before its signature is verified | anyone can forge an event | verify the signature on the raw body first and answer 401 before touching any state |
| a server-side `fetch` to a URL taken from the request; a proxy that forwards to a host or path from the request, or passes hop-by-hop or `Cookie` headers through wrongly | SSRF into internal services; a proxy that opens the whole backend; cookies sent to the wrong host | a fixed upstream host, an allow-list of paths, only the headers the upstream needs, hop-by-hop headers stripped |
| an error response that includes a stack, a SQL error or an internal message | leaks structure and secrets to the caller | log the detail on the server, answer a short generic error with a stable code |
| input with no cap (list sizes, number of ids per call, body size), or no rate limit on an expensive or authentication route | one request can exhaust memory, time or a quota, and sign-in can be brute-forced | a maximum in the schema and a rate limit on that route |
| a secret in committed config (`wrangler.*` `vars`, `.env`), or a new environment variable or secret that the docs and the example config do not mention | the secret is public in the history; the next deploy fails or runs misconfigured | never quote the value; rotate it, then set it as a platform secret and document its name in the example config |
| a Durable Object or other shared state changed by read-then-write across `await`s, or by an action that a retry or two tabs can repeat | a race or a duplicate gives a wrong count, a double booking or a skipped limit | make the change atomic (one transaction or the object's own serialization) and the action idempotent, with a test of two calls at once |

## Out of scope

Backend code that lives outside this repository, live response headers (they need a deployed URL)
and advisories (they need an installed project) cannot be reviewed from a diff. When the change
depends on them, write one line under **Not done** and point to web-quality's `security` skill or
the backend's own review.

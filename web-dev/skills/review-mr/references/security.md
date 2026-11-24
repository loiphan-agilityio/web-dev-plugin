# Security pass

What `review-mr` checks on every changed line of a merge or pull request: web code, and the server
code that lives in the same repository. Each row is a lead: read
the code around it (`git show FETCH_HEAD:<path>`) before writing the comment, and comment only when
untrusted data can really reach the risky place, or the rule is really broken.

The code patterns come from web-quality's `security` skill, which checks the same things across a
whole app; the diff-only rows are what a reviewer sees that a scan of the finished app does not.

## When a security lead is a finding

A security comment names six things: the lower-trust actor (an anonymous visitor, a signed-in user, a user of another tenant or workspace, another site in the browser, a branch author in CI), what they send or do, the control that should stop it, the boundary crossed, whose data or action is affected, and the concrete result. When one is missing, it is a lead, not a comment.

- A missing flag, header, rate limit or best practice with no reachable path to a result is a hardening note: at most a line in the summary, never an inline comment. Self-impact (the user hurting only their own data or session) is not a finding.
- When the deciding fact is outside the repository (a host dashboard, a WAF, the identity provider's or Firebase console settings, a deployed environment variable, proxy behaviour), it is not a finding and not dismissed: one line under **Not done** naming the exact fact and how the owner checks it, with no severity.
- Severity follows the demonstrated result, never more. **critical:** an anonymous actor gets code execution, the whole data store or any account. **high:** an explicit control is fully defeated with real consequences (auth bypass, cross-tenant read or write, stored XSS seen by others). **medium:** a real boundary is crossed with narrow reach or uncommon preconditions. **low:** non-secret internals. Ask whether the change fully defeats the control or only weakens it.
- Variants: when a lead holds, check the sibling paths the diff touches that reach the same action (another route, the socket handler, a queue consumer, a cron, an admin path, search, export). The effective policy is the weakest door.

The finding gate and several rows below are adapted from cloudflare/security-audit-skill (MIT), https://github.com/cloudflare/security-audit-skill.

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
| a `postMessage` handler that acts on `event.data` without an exact `event.origin` check (and `event.source` when several frames share the origin), or sensitive data posted to `*` | any page that can open or frame this one sends commands, or reads the data | compare `event.origin` to one expected origin, check `event.source`, and name the target origin in `postMessage` |
| a deep merge or path assignment (`a.b.c = v` from a key path) fed by URL or JSON data | prototype pollution; a finding only when a gadget later reads the polluted property | reject `__proto__`, `constructor` and `prototype` keys, or use `Map` or `Object.create(null)`; name the gadget in the comment |
| a service worker or Cache Storage entry that holds a personalized response | the next person on the device, or the next account, is served the previous one's data after sign-out or account switch | do not cache authenticated responses, or clear the cache on sign-out and on account change |
| a `BroadcastChannel` or `storage` event that carries identity or a command and is acted on | another tab or a stale session switches the user or triggers an action | bind the message to the current session and re-check it before acting |

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
| untrusted text (`github.event.pull_request.title`, a branch name, an issue body; GitLab `CI_MERGE_REQUEST_TITLE`, `CI_COMMIT_REF_NAME`) interpolated into a `run:` or `script:` shell line | the author of the branch runs shell commands in the job, with its secrets | pass the value through an environment variable and quote it in the script |
| a cache or artifact written by a branch or merge request pipeline and restored by a default-branch or release pipeline | a branch author plants files that the trusted pipeline then runs or ships | key the cache by branch and never restore branch output in a release job; build release artifacts from the default branch |
| a workflow token with wider permissions than the job needs (`permissions: write-all`, no `permissions:` block on a job that only reads); GitLab: a protected variable exposed to unprotected branches | a compromised step or a branch author gets write access or the protected secret | a `permissions:` block with the least each job needs; protected variables only on protected branches |

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
| an ID token or JWT accepted without pinning the algorithm and the key source, or without checking `aud`, `iss` and `exp`; a `kid` or `jku` used to fetch the key; a decode-without-verify path | a forged or foreign token is accepted as a valid session | verify with a fixed algorithm and key set, check `aud`, `iss` and `exp`, and never fetch a key from a token header |
| an OAuth or OIDC callback with no session-bound `state` (and PKCE where used), or a `redirect_uri` not matched exactly | login CSRF and authorization-code theft: the victim signs in as the attacker, or the code goes to another site | bind `state` (and the PKCE verifier) to the session and compare the `redirect_uri` against an exact allow-list |
| a session or refresh token not rotated on sign-in or a privilege change, or still valid after sign-out, password change or account disable | session fixation; a stolen token outlives the event that should end it | issue a new token on sign-in and privilege change; revoke on sign-out, password change and disable |
| a cookie-authenticated state-changing route that accepts a cross-site request (no CSRF token, no strict `Origin` check, `SameSite` not effective for that cookie) | another site makes the signed-in user's browser change their data | check `Origin` against the allow-list or require a CSRF token on every state-changing route |
| a WebSocket upgrade authenticated by cookies with no `Origin` check or per-connection ticket | another site opens the socket as the signed-in user and reads or sends | check `Origin` on the upgrade, or issue a short-lived one-use ticket per connection |
| a personalized response that a CDN or edge cache can store (public `cache-control`, a static-looking suffix such as `.css` on a dynamic route) | cache deception: the next visitor is served the first one's page | `cache-control: private, no-store` on personalized responses; do not route static-looking paths to dynamic handlers |
| `Host` or `X-Forwarded-*` used to build a reset link, a callback URL or tenant routing | the link or the tenant is chosen by the caller: password-reset poisoning, cross-tenant routing | take the base URL and the tenant from server config or the verified session |
| a queue message, webhook or internal event whose body fields (`userId`, `tenantId`) are trusted as the actor, with no re-check of current access when it is consumed; an out-of-order or duplicate message applied (an edit after a delete) | an old or forged message acts with access the actor no longer has, or resurrects deleted data | re-check access at consume time, and make the consumer ignore a stale or repeated message (a version or sequence check) |
| a membership removal, role downgrade or deactivation that does not end live sockets, subscriptions, cached permissions or queued jobs | the removed user keeps reading or acting until the connection or job ends | close their sockets, drop subscriptions, clear the permission cache and cancel their queued jobs in the same change |
| a derived copy (search index, cache, thumbnail, export, push payload, analytics or log) that is not filtered by current access at read time, or not updated when the source row is deleted | the copy shows or keeps data the user may no longer see | filter by current access when reading the copy, and delete or update it with the source |
| a response that tells a private object exists (404 against 403, a 409 on a unique name, a count) to someone who may not see it | existence of another tenant's data leaks | answer the same for "missing" and "not yours"; scope unique names and counts to what the caller may see |
| a regex or parser on user input with superlinear cost, or decompression or JSON nesting with no cap | one request burns the CPU or memory of the service | a linear-time pattern or a length limit before matching; caps on decompressed size and nesting depth |

## LLM features

Only when the diff touches prompts, tools or model output.

| Pattern in the diff | Risk | What the comment asks for |
|---|---|---|
| user or retrieved content (a web page, an email, a document) placed in the prompt of a model that can call tools with the user's or the service's authority | indirect prompt injection: the content steers the tool, a confused deputy | tools scoped to the requesting user's access; a confirmation step before any write or send |
| model output rendered as HTML or markdown with links or images | XSS, and data leaks through an image URL the browser fetches | render as text, or sanitize and block remote images and unknown link targets |
| one user's context, memory or cache read in another user's request | cross-user data leak | key context, memory and caches by user and tenant, and check them at read time |

## Out of scope

Backend code that lives outside this repository, live response headers (they need a deployed URL)
and advisories (they need an installed project) cannot be reviewed from a diff. When the change
depends on them, write one line under **Not done** and point to web-quality's `security` skill or
the backend's own review.

A lead that depends on a fact outside the repository goes under **Not done** as a "needs owner check" line (see "When a security lead is a finding").

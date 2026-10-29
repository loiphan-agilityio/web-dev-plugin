# Cloudflare Pages and GitHub, once per repository

What `.github/workflows/ci.yml` reads, from its header comment at the pinned commit. `<wrangler>`
is the `WRANGLER:` value at the top of the project's `ci.yml` (`wrangler@4.149.0` at this pin), so
the user's machine runs the version CI runs.

| Name | Kind | Holds | Without it |
|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | secret | an API token with the permission Account > Cloudflare Pages > Edit | every deploy fails |
| `CLOUDFLARE_ACCOUNT_ID` | variable | the account the Pages projects are in | every deploy fails |
| `CLOUDFLARE_PAGES_APP_PROJECT` | variable | the app's Pages project | the deploy jobs are skipped, and so are Lighthouse and e2e, which follow them |
| `CLOUDFLARE_PAGES_STORYBOOK_PROJECT` | variable | Storybook's | Storybook is not deployed |
| `CLOUDFLARE_PAGES_UT_PROJECT` | variable | the unit tests' coverage report | the report is only an artifact of the run |
| `CLOUDFLARE_PAGES_PROJECT` | variable | the e2e Allure report | the report is only an artifact of the run |

Each site is a Pages project of its own, since a project has one production deploy. Set up all
four unless the user leaves one out.

## 0. Tools, one per side

Check each side once and use the same tool for all its steps:

- **GitHub:** `gh auth status` exits 0: `gh`. Otherwise (not installed or signed out): Claude in
  Chrome on `github.com`.
- **Cloudflare:** `npx -y <wrangler> whoami --json` exits 0: wrangler. Otherwise: Claude in Chrome
  on `dash.cloudflare.com`.

**Claude in Chrome:** read the Claude in Chrome skill first when it is installed. Load the tools in
ONE ToolSearch call (`select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__find,mcp__claude-in-chrome__form_input,mcp__claude-in-chrome__file_upload`;
before it is turned on the only one may be `enable__mcp__claude-in-chrome`: call that first), call
`tabs_context_mcp`, then work in a new tab. The browser carries the user's own sign-ins: on a sign-in
page, ask the user to sign in in that tab and wait; never type a password or a one-time code. Read
each page before acting on it, since the dashboards change: the paths below say where to go, the
page says what to click. Without the Chrome tools either, ask the user to run `! gh auth login` or
`! npx <wrangler> login` and check again; still nothing: that side goes under **Blocked by**.

**The repository** is `git remote get-url origin`:

- on GitHub: `<owner>/<repo>` from the URL. When it has no `main` yet (an empty repository:
  `git ls-remote --exit-code --heads origin main` exits 2), `PROTECTED_BRANCHES=none git push -u
  origin main` creates it, as below, before section 6 protects it;
- on another host: stop, the workflow is GitHub Actions;
- none: ask for the URL of an empty GitHub repository, or offer to create one (`gh repo create
  <owner>/<repo> --private`, or `github.com/new` in Chrome: private, no README, license or
  `.gitignore`). Then `git remote add origin <url>` and
  `PROTECTED_BRANCHES=none git push -u origin main`: the `pre-push` hook refuses `main`, and this
  first push creates it. Never `--no-verify` or `--force`.

## 1. One question, then run

Ask once (the `AskUserQuestion` tool when available): create the four Pages projects `<repo>`,
`<repo>-storybook`, `<repo>-coverage` and `<repo>-e2e-report` and set the variables, or other
names. With more than one Cloudflare account (section 2), ask which in the same question. On a yes,
run sections 2 to 5 without asking again; each CLI command still shows its permission prompt.

## 2. Account id

- wrangler: `accounts[].id` from `whoami --json`.
- Chrome: open `https://dash.cloudflare.com/`; once it loads, the URL is
  `dash.cloudflare.com/<account id>/...`. An account picker means several accounts.

## 3. Pages projects

- wrangler: `npx -y <wrangler> pages project list --json`, then for each name not listed:

  ```bash
  npx -y <wrangler> pages project create <name> --production-branch main
  ```

- Chrome: Workers & Pages > Create > Pages > Direct Upload (upload assets), the project's name,
  Create project. CI deploys the files: leave the upload page without uploading. Check the
  project is on the Workers & Pages list and that its production branch is `main`.

`main` must stay the production branch: a deploy to any other branch is a preview, which is how
the workflow tells the two apart. The `*.pages.dev` address can differ from the name (the
boilerplate's `react-vite-boilerplate` serves at `react-vite-boilerplate-9od.pages.dev`): the
workflow reads each URL from wrangler's output, so nothing needs it.

## 4. The API token: the user creates and pastes it

The token never goes through the chat or Claude's context: no screenshot, page read or `find` while
it is on screen. A token that appears anyway (pasted in the chat, read off a page): do not repeat
it, and tell the user to revoke it and create another.

1. **Create.** With wrangler, tell the user to create it on the Cloudflare dashboard's API Tokens
   page. With Chrome, open `https://dash.cloudflare.com/profile/api-tokens`, Create Token > Custom
   token, and fill in the name (`<repo> GitHub Actions`), the one permission Account > Cloudflare
   Pages > Edit and the account from section 2, up to the summary. Then hand over: the user
   clicks Create Token and copies the token. Do not touch the tab until they say they are done.
2. **Store.** With `gh`, the user runs `gh secret set CLOUDFLARE_API_TOKEN --repo <owner>/<repo>`
   in their own terminal and pastes it at the prompt. With Chrome, first navigate away from the
   token's page, then open
   `https://github.com/<owner>/<repo>/settings/secrets/actions/new`, type the name
   `CLOUDFLARE_API_TOKEN` and hand over: the user pastes the value and clicks Add secret.
3. **Check.** `gh secret list`, or the page `settings/secrets/actions`, lists
   `CLOUDFLARE_API_TOKEN` (the value is never shown).

## 5. Variables

One per value from sections 2 and 3 (only the projects created):

- gh, from the repository root:

  ```bash
  gh variable set CLOUDFLARE_ACCOUNT_ID --body <account id>
  gh variable set CLOUDFLARE_PAGES_APP_PROJECT --body <app project>
  gh variable set CLOUDFLARE_PAGES_STORYBOOK_PROJECT --body <storybook project>
  gh variable set CLOUDFLARE_PAGES_UT_PROJECT --body <coverage project>
  gh variable set CLOUDFLARE_PAGES_PROJECT --body <e2e report project>
  ```

- Chrome: `https://github.com/<owner>/<repo>/settings/variables/actions/new`, the name and the
  value, Add variable; once per variable.

`gh variable list`, or the page `settings/variables/actions`, shows what is set. A pull request
from a fork or Dependabot gets no secrets: only its checks run, and `main` deploys after the merge.

## 6. Branch protection

`.github/rulesets/main.json` protects the default branch: no deletion or force push, a
squash-merged pull request, and the checks `Checks: lint, typecheck, unit, build`,
`Deploy: preview` and `Lighthouse: deployed preview`. Applying it needs a repository admin; ask
first.

Apply it only once GitHub has `main` (`git ls-remote --exit-code --heads origin main` exits 0):
it refuses every push to `main`, the one that creates it included, and nobody bypasses it, so on
an empty repository nothing could ever reach `main` again. Without `main` (its push failed), the
ruleset goes under **Not done**, to apply after `main` is pushed.

A push to `main` refused with `GH013: Repository rule violations` means a ruleset is already
there (`gh api repos/<owner>/<repo>/rules/branches/main` lists the active rules and their
`ruleset_id`). Never lift it yourself: **Blocked by** names it, with the commands for the user to
lift it (`gh api -X PUT repos/<owner>/<repo>/rulesets/<id> -f enforcement=disabled`), push, and
turn it back on (`-f enforcement=active`).

- gh: `gh api repos/<owner>/<repo>/rulesets` lists the rulesets. With none named `main`:
  `gh api -X POST repos/<owner>/<repo>/rulesets --input .github/rulesets/main.json`. One named
  `main` (an older pipeline's): update it in place, before the pull request, with
  `gh api -X PUT repos/<owner>/<repo>/rulesets/<id> --input .github/rulesets/main.json`.
- Chrome: `https://github.com/<owner>/<repo>/settings/rules`. With none named `main`: New ruleset >
  Import a ruleset, and upload `.github/rulesets/main.json` (`file_upload`). One named `main`:
  delete it (ask first), then import.

An old ruleset requires the old jobs' checks (`Deploy: Netlify draft`, `E2E: deployed preview`),
which the new workflow never reports, so the pull request could not merge.

The `deploy-production` job runs in the `production` environment, which GitHub creates on its
first run; approvals for it are set there (Settings > Environments).

## 7. After a move from Netlify

Once a Cloudflare deploy has passed, the Netlify settings are read by nothing. Offer to remove
them, each on a yes: `gh secret delete NETLIFY_AUTH_TOKEN`, `gh variable delete NETLIFY_SITE_ID`
and `gh variable delete NETLIFY_STORYBOOK_SITE_ID` (only those `gh secret list` and
`gh variable list` show), or the same names on the Actions secrets and variables pages in Chrome.
The Netlify site itself, and a custom domain pointing at it, are the user's to move: a domain goes
under the Pages project's Custom domains.

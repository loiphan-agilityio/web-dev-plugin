# Cloudflare Pages and GitHub, once per repository

What `.github/workflows/ci.yml` reads, from its header comment at the pinned commit. Every command
below asks before it runs. `<wrangler>` is the `WRANGLER:` value at the top of the project's
`ci.yml` (`wrangler@4.149.0` at this pin), so the user's machine runs the version CI runs.

| Name | Kind | Holds | Without it |
|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | secret | an API token with the permission Account > Cloudflare Pages > Edit | every deploy fails |
| `CLOUDFLARE_ACCOUNT_ID` | variable | the account the Pages projects are in | every deploy fails |
| `CLOUDFLARE_PAGES_APP_PROJECT` | variable | the app's Pages project | the deploy jobs are skipped, and so are Lighthouse and e2e, which follow them |
| `CLOUDFLARE_PAGES_STORYBOOK_PROJECT` | variable | Storybook's (optional) | Storybook is not deployed |
| `CLOUDFLARE_PAGES_UT_PROJECT` | variable | the unit tests' coverage report (optional) | the report is an artifact of the run |
| `CLOUDFLARE_PAGES_PROJECT` | variable | the e2e Allure report (optional) | the report is an artifact of the run |

Each site is a Pages project of its own, since a project has one production deploy.

## 1. Sign in to Cloudflare

`npx -y <wrangler> whoami --json`. A non-zero exit means no sign-in: ask the user to run
`npx <wrangler> login` themselves (it opens a browser), then run `whoami` again. The account id is
`accounts[].id`; with more than one account, ask which.

## 2. Pages projects

Ask once for the names (one question, with these defaults from the repository name): `<repo>` for
the app, and which of `<repo>-storybook`, `<repo>-coverage` and `<repo>-e2e-report` to add. Then
`npx -y <wrangler> pages project list --json`, and for each name not listed:

```bash
npx -y <wrangler> pages project create <name> --production-branch main
```

`main` must stay the production branch: a deploy to any other branch is a preview, which is how
the workflow tells the two apart. The `*.pages.dev` address can differ from the name (the
boilerplate's `react-vite-boilerplate` serves at `react-vite-boilerplate-9od.pages.dev`): the
workflow reads each URL from wrangler's output, so nothing needs it.

## 3. The API token: the user sets it

Claude cannot create the token, and it never goes through the chat. Tell the user to:

1. create it in the Cloudflare dashboard, on its API Tokens page: a custom token with the one
   permission Account > Cloudflare Pages > Edit, for the account from step 1;
2. run `gh secret set CLOUDFLARE_API_TOKEN` in their own terminal, from the repository, and paste
   it at the prompt.

Then `gh secret list` must show `CLOUDFLARE_API_TOKEN`. A token pasted into the chat anyway: do not
repeat it, and tell the user to revoke it and create another.

## 4. Variables

From the repository root, one per value from steps 1 and 2 (only the projects created):

```bash
gh variable set CLOUDFLARE_ACCOUNT_ID --body <account id>
gh variable set CLOUDFLARE_PAGES_APP_PROJECT --body <app project>
gh variable set CLOUDFLARE_PAGES_STORYBOOK_PROJECT --body <storybook project>
gh variable set CLOUDFLARE_PAGES_UT_PROJECT --body <coverage project>
gh variable set CLOUDFLARE_PAGES_PROJECT --body <e2e report project>
```

`gh variable list` shows what is set. A pull request from a fork or Dependabot gets no secrets:
only its checks run, and `main` deploys after the merge.

## 5. Branch protection

`.github/rulesets/main.json` protects the default branch: no deletion or force push, a
squash-merged pull request, and the checks `Checks: lint, typecheck, unit, build`,
`Deploy: preview` and `Lighthouse: deployed preview`. Applying it needs a repository admin; ask
first.

- `gh api repos/<owner>/<repo>/rulesets` lists the rulesets. With none named `main`:
  `gh api -X POST repos/<owner>/<repo>/rulesets --input .github/rulesets/main.json`.
- One named `main` exists (an older pipeline's): update it in place, before the pull request,
  with `gh api -X PUT repos/<owner>/<repo>/rulesets/<id> --input .github/rulesets/main.json`. An
  old ruleset requires the old jobs' checks (`Deploy: Netlify draft`, `E2E: deployed preview`),
  which the new workflow never reports, so the pull request could not merge.

The `deploy-production` job runs in the `production` environment, which GitHub creates on its
first run; approvals for it are set there (Settings > Environments).

## 6. After a move from Netlify

Once a Cloudflare deploy has passed, the Netlify settings are read by nothing. Offer to remove
them, each on a yes: `gh secret delete NETLIFY_AUTH_TOKEN`, `gh variable delete NETLIFY_SITE_ID`
and `gh variable delete NETLIFY_STORYBOOK_SITE_ID` (only those `gh secret list` and
`gh variable list` show). The Netlify site itself, and a custom domain pointing at it, are the
user's to move: a domain goes under the Pages project's Custom domains.

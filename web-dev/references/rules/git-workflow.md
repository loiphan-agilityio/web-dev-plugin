# Branches, pull requests and commits

A project's own `.claude/rules/` adds its scopes, its description template and its protected
branches; it does not repeat this file.

## Branches

Name a branch `<type>/<description>` ([Conventional Branch](https://conventional-branch.github.io/)).
`<type>` is the commitlint type of its main commit (the list under "Pull requests");
`<description>` is 3 to 6 lowercase English words in kebab-case, the gist of the pull request's
subject, at most 40 characters after the slash. No ticket number or other digits: the ticket is
linked in the pull request (`Closes #8`). `feat/add-item-search-filter`, not `feat/9-search`. No
hook checks it: rename a wrong branch before its first push.

## Pull requests (merge requests on GitLab)

The title becomes the squash commit, so it follows Conventional Commits in the Angular style:
`type(scope): summary`.

- `type`: one of the types commitlint accepts (`feat`, `fix`, `refactor`, `perf`, `test`, `docs`,
  `style`, `build`, `ci`, `chore`, `revert`).
- `scope`: the one package the change touches (`web`, `ui`...). When it touches more than one,
  the project's rule for it, else leave it out. Leave it out for a change outside `apps/` and
  `packages/` (`ci: ...`, `docs: ...`).
- `summary`: imperative, lowercase, no trailing period, no ticket number. The whole title stays
  under 72 characters.

`feat(web): filter items by status`; not `[#17] feat: Add filter.`

The description follows the repository's template when it has one (`.github/pull_request_template.md`,
`.gitlab/merge_request_templates/`), else the web-dev `pr` skill's. It says what ran, its result,
and what did not run.

## Commits

- Conventional Commits: `type(scope): summary`. The `commit-msg` hook (commitlint) rejects
  anything else.
- Fix what the hooks report; never commit with `--no-verify`. A protected branch changes only
  through a reviewed pull request.

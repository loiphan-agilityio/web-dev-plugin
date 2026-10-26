#!/usr/bin/env bash
# Checks what deploy-setup's sync-pipeline.mjs reports, writes and refuses, in a temporary
# directory: projects created at the last commit that deployed to Netlify (4699948, a web app and a
# landing page) are brought to the pinned pipeline and then match a project created at the pin; a
# project at the pin has nothing to change; a file with uncommitted changes blocks the whole sync;
# package.json gets the pipeline's missing entries and keeps the project's own values. Clones the
# boilerplate (network; BOILERPLATE_REPO and BOILERPLATE_REF as in create-project.sh pick the
# reference) and installs nothing. tools/verify.sh calls it.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
plugin="$here/../web-dev"
create="$plugin/skills/project-setup/scripts/create-project.sh"
sync="$plugin/skills/deploy-setup/scripts/sync-pipeline.mjs"
netlify_commit=4699948f8f59b044869b98d4d932d8fa622a9ac3
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

failed=0
ok() { echo "  ok   $1"; }
fail() {
  echo "  FAIL $1" >&2
  failed=1
}
# run <name> <exit code> -- <sync-pipeline args>: the JSON lands in $tmp/<name>.json
run() {
  local name="$1" want="$2" got=0
  shift 3
  node "$sync" "$@" >"$tmp/$name.json" 2>"$tmp/$name.err" || got=$?
  if [[ "$got" == "$want" ]]; then ok "$name"; else fail "$name: exit $got, expected $want: $(cat "$tmp/$name.err")"; fi
}
# holds <name> <json file> <JavaScript expression on r, the parsed report>
holds() {
  if node -e 'const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); process.exit(eval(process.argv[2]) ? 0 : 1)' "$2" "$3"; then
    ok "$1"
  else
    fail "$1: $3 is false in $(cat "$2")"
  fi
}
# project <dir> <--auth|--landing> [ref]: a project in a git repository with one commit
project() {
  BOILERPLATE_REF="${3:-${BOILERPLATE_REF:-}}" bash "$create" "$1" "$2" >/dev/null
  git -C "$1" init --quiet
  git -C "$1" add -A
  git -C "$1" -c user.name=check -c user.email=check@example.com commit --quiet -m init
}
commit() {
  git -C "$1" add -A
  git -C "$1" -c user.name=check -c user.email=check@example.com commit --quiet -m change
}
pipeline=(.github/workflows/ci.yml .github/rulesets/main.json apps/web/playwright.config.ts
  apps/web/allurerc.ts apps/web/public/_headers apps/web/public/assets/404.html
  tools/check-report.mjs tools/lib/check-report.mjs)
same_pipeline() {
  for f in "${pipeline[@]}"; do
    cmp -s "$1/$f" "$2/$f" || fail "$3: $f differs from a project created at the pin"
  done
}

echo "check-sync-pipeline:"
project "$tmp/pinned" --auth
project "$tmp/pinned-landing" --landing
project "$tmp/old" --auth "$netlify_commit"
project "$tmp/old-landing" --landing "$netlify_commit"

run pinned 0 -- "$tmp/pinned"
holds pinned-nothing "$tmp/pinned.json" 'r.variant === "auth" && r.changes.length === 0 && r.leftovers.length === 0'

# package.json: a missing devDependency and script come back, a changed value stays.
node -e '
  const fs = require("fs"), path = process.argv[1], pkg = JSON.parse(fs.readFileSync(path, "utf8"));
  delete pkg.devDependencies.allure;
  delete pkg.scripts["test:e2e:report"];
  pkg.scripts.test = "vitest run";
  fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
' "$tmp/old/apps/web/package.json"
commit "$tmp/old"
run report 0 -- "$tmp/old"
# shellcheck disable=SC2016 # JavaScript template literals, not shell expansions.
holds report-changes "$tmp/report.json" '!r.applied && ["update .github/workflows/ci.yml", "add apps/web/public/_headers", "remove apps/web/netlify.toml", "section CLAUDE.md", "merge apps/web/package.json"].every((c) => r.changes.some((x) => `${x.action} ${x.path}` === c))'
holds report-kept "$tmp/report.json" 'r.kept.some((k) => k.detail.startsWith("scripts.test"))'
holds report-leftovers "$tmp/report.json" 'r.leftovers.some((l) => l.path === "apps/web/CLAUDE.md" && l.reference.join("").includes("Cloudflare Pages"))'
[[ -z "$(git -C "$tmp/old" status --porcelain)" ]] || fail "report: changed files without --apply"

echo '# mine' >>"$tmp/old/.github/workflows/ci.yml"
run blocked 1 -- "$tmp/old" --apply
holds blocked-lists "$tmp/blocked.json" '!r.applied && r.blocked.length === 1 && r.blocked[0].path === ".github/workflows/ci.yml"'
[[ -e "$tmp/old/apps/web/netlify.toml" && ! -e "$tmp/old/apps/web/public/_headers" ]] ||
  fail "blocked: wrote files although a file was blocked"
git -C "$tmp/old" checkout --quiet -- .github/workflows/ci.yml

run apply 0 -- "$tmp/old" --apply
holds applied "$tmp/apply.json" 'r.applied'
same_pipeline "$tmp/old" "$tmp/pinned" apply
[[ ! -e "$tmp/old/apps/web/netlify.toml" ]] || fail "apply: apps/web/netlify.toml is still there"
holds merged <(cat "$tmp/old/apps/web/package.json") 'r.devDependencies.allure && r.scripts["test:e2e:report"] && r.scripts.test === "vitest run"'
commit "$tmp/old"
run again 0 -- "$tmp/old"
holds again-nothing "$tmp/again.json" 'r.changes.length === 0'

run landing 0 -- "$tmp/old-landing" --apply
holds landing-variant "$tmp/landing.json" 'r.applied && r.variant === "landing"'
same_pipeline "$tmp/old-landing" "$tmp/pinned-landing" landing

mkdir -p "$tmp/other/apps/web"
echo 'packages: [apps/*]' >"$tmp/other/pnpm-workspace.yaml"
(cd "$tmp/other/apps/web" && bash "$plugin/evals/fixtures/other-stack-app.sh")
run other-stack 1 -- "$tmp/other"
run not-a-root 2 -- "$tmp/other/apps/web"
exit "$failed"

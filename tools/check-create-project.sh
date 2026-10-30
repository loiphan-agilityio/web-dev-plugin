#!/usr/bin/env bash
# Checks what project-setup's create-project.sh creates and refuses, in a temporary directory: the
# two variants of the boilerplate (web app, always with auth; landing page) with their Claude Code
# settings, the merge into a folder that holds .git/ and .claude/ (its own settings.json kept),
# --replace over a pulled main (its tracked files replaced, untracked ones still refused), and the
# refusals. Clones the boilerplate
# (network; BOILERPLATE_REPO points it at another clone URL) and installs nothing.
# tools/verify.sh calls it, then runs the gates in a project it creates.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
plugin="$here/../web-dev"
create="$plugin/skills/project-setup/scripts/create-project.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

failed=0
ok() { echo "  ok   $1"; }
fail() {
  echo "  FAIL $1" >&2
  failed=1
}
# expect <name> <exit code> <pattern in the output> -- <create-project args>
expect() {
  local name="$1" want="$2" pattern="$3" got=0
  shift 4
  bash "$create" "$@" >"$tmp/out" 2>&1 || got=$?
  if [[ "$got" != "$want" ]]; then
    fail "$name: exit $got, expected $want: $(cat "$tmp/out")"
  elif ! grep -q -- "$pattern" "$tmp/out"; then
    fail "$name: the output lacks '$pattern': $(cat "$tmp/out")"
  else
    ok "$name"
  fi
}
# holds <name> <file> <pattern>
holds() {
  if grep -q -- "$3" "$2"; then ok "$1"; else fail "$1: $2 lacks '$3'"; fi
}

mkdir -p "$tmp/auth/.git" "$tmp/auth/.claude" "$tmp/blocked"
echo mine >"$tmp/auth/.claude/mine.txt"
echo mine >"$tmp/auth/.claude/settings.json"
touch "$tmp/blocked/apps"
# replace: a main with a README the boilerplate also has, and a file it does not.
git init --quiet -b main "$tmp/replace"
echo "Hello World" >"$tmp/replace/README.md"
echo old >"$tmp/replace/old.txt"
git -C "$tmp/replace" add -A
git -C "$tmp/replace" -c user.name=t -c user.email=t@t commit --quiet -m "docs: add readme"

echo "check-create-project:"
expect no-choice 1 'pass --auth or --landing' -- "$tmp/none"
expect no-auth-refused 1 'pass --auth or --landing' -- "$tmp/none" --no-auth
[[ ! -e "$tmp/none" ]] || fail "no-choice created $tmp/none"
expect auth 0 'with authentication.*kept the existing .claude/settings.json' -- "$tmp/auth" --auth
expect app 0 'with authentication' -- "$tmp/app" --auth
expect landing 0 'a landing page' -- "$tmp/landing" --landing
holds auth-wired "$tmp/auth/apps/web/src/lib/runtime.ts" 'AuthToken.fromGetter(tokenStore.get, tokenStore.reject)'
holds auth-routes "$tmp/auth/apps/web/src/app/routes.tsx" 'protectedRoutes('
# Named after the target, not the generator's temporary folder.
holds named "$tmp/app/package.json" '"name": "app"'
holds keeps-claude "$tmp/auth/.claude/mine.txt" mine
holds keeps-settings "$tmp/auth/.claude/settings.json" mine
holds settings "$tmp/app/.claude/settings.json" 'DIR\\"/.claude/hooks/format.mjs'
holds app-settings "$tmp/app/apps/web/.claude/settings.json" '/../../.claude/hooks/format.mjs'
holds format-hook "$tmp/app/.claude/hooks/format.mjs" prettier
holds landing-page "$tmp/landing/apps/web/src/app/home-page.tsx" 'people'
holds landing-sitemap "$tmp/landing/apps/web/public/robots.txt" 'Sitemap:'
[[ ! -e "$tmp/landing/apps/web/src/features/auth" ]] || fail "landing has src/features/auth"
[[ -e "$tmp/app/apps/web/src/features/auth" ]] || fail "web app lacks src/features/auth"
for dir in "$tmp/auth" "$tmp/app" "$tmp/landing"; do
  [[ ! -e "$dir/create" ]] || fail "$dir still has the generator (create/)"
  ! grep -q template-only "$dir/CLAUDE.md" || fail "$dir/CLAUDE.md keeps the template-only block"
  tier=template
  [[ "$dir" != "$tmp/landing" ]] || tier=landing
  holds "tier $(basename "$dir")" <(node "$plugin/scripts/detect-project.mjs" "$dir/apps/web") \
    "\"tier\": \"$tier\""
done
expect existing-kept 1 'apps/web/CLAUDE.md' -- "$tmp/auth" --auth
expect file-for-dir 1 'apps (a file where the project has a directory)' -- "$tmp/blocked" --auth
[[ "$(ls -A "$tmp/blocked")" == apps ]] || fail "file-for-dir copied files into $tmp/blocked"
expect bad-option 1 'unknown option' -- "$tmp/none" --auth --force
expect name-web 1 'cannot be named web' -- "$tmp/web" --landing
[[ ! -e "$tmp/web" ]] || fail "name-web created $tmp/web"
expect name-empty 1 '--name needs a value' -- "$tmp/none" --landing --name
expect named-landing 0 'a landing page' -- "$tmp/web" --landing --name acme
holds named-package "$tmp/web/package.json" '"name": "acme"'
holds named-title "$tmp/web/apps/web/index.html" '<title>acme</title>'
expect replace-no-git 1 'needs a git repository' -- "$tmp/blocked" --auth --replace
echo dirty >>"$tmp/replace/old.txt"
expect replace-dirty 1 'needs a clean working tree' -- "$tmp/replace" --auth --replace
git -C "$tmp/replace" checkout --quiet -- old.txt
echo mine >"$tmp/replace/package.json"
expect replace-untracked 1 'package.json' -- "$tmp/replace" --auth --replace
[[ -e "$tmp/replace/old.txt" ]] || fail "replace-untracked deleted old.txt"
rm "$tmp/replace/package.json"
expect replace 0 'replaced the 2 files git tracked' -- "$tmp/replace" --auth --replace
[[ ! -e "$tmp/replace/old.txt" ]] || fail "replace kept old.txt"
holds replace-routes "$tmp/replace/apps/web/src/app/routes.tsx" 'protectedRoutes('
exit "$failed"

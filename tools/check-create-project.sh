#!/usr/bin/env bash
# Checks what project-setup's create-project.sh creates and refuses, in a temporary directory: both
# variants of the boilerplate with their Claude Code settings, the merge into a folder that holds
# .git/ and .claude/ (its own settings.json kept), and the refusals. Clones the boilerplate
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

echo "check-create-project:"
expect no-choice 1 'pass --auth or --no-auth' -- "$tmp/none"
[[ ! -e "$tmp/none" ]] || fail "no-choice created $tmp/none"
expect auth 0 'with authentication.*kept the existing .claude/settings.json' -- "$tmp/auth" --auth
expect no-auth 0 'without authentication' -- "$tmp/plain" --no-auth
# A prefix: the boilerplate wires `fromGetter(tokenStore.get, tokenStore.reject)` since its auth
# variant drops a token the API rejects, and `fromGetter(tokenStore.get)` before that.
holds auth-wired "$tmp/auth/apps/web/src/lib/runtime.ts" 'AuthToken.fromGetter(tokenStore.get'
holds auth-routes "$tmp/auth/apps/web/src/app/routes.tsx" 'protectedRoutes('
holds no-auth-base "$tmp/plain/apps/web/src/lib/runtime.ts" 'AuthToken.none'
# Named after the target, not the generator's temporary folder (a boilerplate with create --name).
holds named "$tmp/plain/package.json" '"name": "plain"'
holds keeps-claude "$tmp/auth/.claude/mine.txt" mine
holds keeps-settings "$tmp/auth/.claude/settings.json" mine
holds settings "$tmp/plain/.claude/settings.json" 'DIR\\"/.claude/hooks/format.mjs'
holds app-settings "$tmp/plain/apps/web/.claude/settings.json" '/../../.claude/hooks/format.mjs'
holds format-hook "$tmp/plain/.claude/hooks/format.mjs" prettier
[[ ! -e "$tmp/plain/apps/web/src/features/auth" ]] || fail "no-auth has src/features/auth"
for dir in "$tmp/auth" "$tmp/plain"; do
  [[ ! -e "$dir/create" ]] || fail "$dir still has the generator (create/)"
  ! grep -q template-only "$dir/CLAUDE.md" || fail "$dir/CLAUDE.md keeps the template-only block"
  holds "tier $(basename "$dir")" <(node "$plugin/scripts/detect-project.mjs" "$dir/apps/web") \
    '"tier": "template"'
done
expect existing-kept 1 'apps/web/CLAUDE.md' -- "$tmp/auth" --auth
expect file-for-dir 1 'apps (a file where the project has a directory)' -- "$tmp/blocked" --no-auth
[[ "$(ls -A "$tmp/blocked")" == apps ]] || fail "file-for-dir copied files into $tmp/blocked"
exit "$failed"

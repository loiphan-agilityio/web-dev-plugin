#!/usr/bin/env bash
# Proves that the code the skills quote passes every gate in a project created from the
# react-vite-boilerplate, the project users get. Exits non-zero on the first failure.
#
# 0. Checks that detect-project.mjs gives each eval fixture its tier, and what project-setup's
#    create-project.sh creates from the boilerplate and refuses (check-create-project.sh).
# 1. Creates a project with create-project.sh --no-auth (clones the boilerplate: network;
#    BOILERPLATE_REPO points it at another clone URL), checks that the plugin's shared references/
#    match its apps/web/CLAUDE.md (check-guidelines.mjs), that its app names no todos (a new
#    project starts empty; the todos feature is only the skills' worked example), and checks the
#    hook in apps/web/.claude/settings.json that formats each file Claude writes.
# 2. Writes the todos feature quoted in the skills' markdown into apps/web (every block marked
#    `file=...`, see extract-snippets.mjs), applies its wiring diff, installs Chromium and runs
#    all six gates (lint, typecheck, test, build, Storybook build, Playwright e2e) across the
#    monorepo.
#
#   tools/verify.sh [--keep]   --keep leaves the temp project in place, prints its path
set -euo pipefail

keep=false
case "${1:-}" in
  --keep) keep=true ;;
  '') ;;
  *)
    echo "usage: verify.sh [--keep]" >&2
    exit 2
    ;;
esac

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
tmp="$(mktemp -d)"
if [[ "$keep" == false ]]; then
  trap 'rm -rf "$tmp"' EXIT
fi

plugin_root="$(cd "$here/../web-dev" && pwd)"
skills_root="$plugin_root/skills"
bash "$plugin_root/evals/fixtures/check-detect.sh"
bash "$here/check-create-project.sh"

bash "$skills_root/project-setup/scripts/create-project.sh" "$tmp/app" --no-auth
app="$tmp/app/apps/web"
node "$here/check-guidelines.mjs" "$plugin_root/references" "$app/CLAUDE.md"
if grep -rniI todo "$app/src"; then
  echo "verify: the new project's app mentions todos (above); it carries no example feature" >&2
  exit 1
fi
cd "$tmp/app"
pnpm install --frozen-lockfile

# The PostToolUse hook of a session in the app formats the file Claude wrote, and nothing outside
# the project. Its command runs as Claude Code runs it: hook input on stdin, CLAUDE_PROJECT_DIR set.
# Claude Code passes native paths. In Git Bash, $PWD is /c/...: MSYS converts it in an environment
# variable but not inside the JSON, so the hook would see the file outside the project and skip it.
native() {
  if command -v cygpath >/dev/null; then cygpath -m "$1"; else printf '%s' "$1"; fi
}
cd "$app"
hook="$(node -p "require('./.claude/settings.json').hooks.PostToolUse[0].hooks[0].command")"
unformatted='export const x = {a:1}'
echo "$unformatted" | tee src/hook-check.ts >"$tmp/outside.ts"
for f in "$PWD/src/hook-check.ts" "$tmp/outside.ts"; do
  printf '{"tool_input":{"file_path":"%s"}}' "$(native "$f")" |
    CLAUDE_PROJECT_DIR="$(native "$PWD")" bash -c "$hook"
done
pnpm exec prettier --check src/hook-check.ts
rm src/hook-check.ts
if [[ "$(cat "$tmp/outside.ts")" != "$unformatted" ]]; then
  echo "verify: the format hook changed a file outside the project" >&2
  exit 1
fi

node "$here/extract-snippets.mjs" "$skills_root" "$app"
# core.autocrlf would turn the patched files to CRLF on Windows, and Prettier rejects that.
git -c core.autocrlf=false apply wiring.diff
rm wiring.diff
cd "$tmp/app"
# The e2e gate needs Chromium; CI images also lack its system libraries, which --with-deps adds.
if [[ -n "${CI:-}" ]]; then
  pnpm --filter web exec playwright install --with-deps chromium
else
  pnpm test:e2e:install
fi
pnpm check
if [[ "$keep" == true ]]; then
  echo "verify: the quoted todos feature passed all gates in a project from the boilerplate (kept at $tmp/app)"
else
  echo "verify: the quoted todos feature passed all gates in a project from the boilerplate"
fi

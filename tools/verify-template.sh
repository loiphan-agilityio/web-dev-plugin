#!/usr/bin/env bash
# Proves the template and the code the skills quote still pass every gate. Exits non-zero on the
# first failure.
#
# 0. Checks that the plugin's shared references/ match the template's CLAUDE.md
#    (check-guidelines.mjs) and that detect-project.mjs gives each eval fixture its tier.
# 1. Scaffolds the template into a temporary directory, checks that it names no todos (a new
#    project starts empty; the todos feature is only the skills' worked example), copies the
#    plugin into its .claude/ (as a project that copies the folders has it) and runs all five
#    gates (lint, typecheck, test, build, Storybook build), then checks the commit-message rules
#    (commitlint) and the Claude Code hook that formats each file Claude writes.
# 2. Writes the todos feature quoted in the skills' markdown into that app (every block marked
#    `file=...`, see extract-snippets.mjs), applies its wiring diff and runs all five gates again.
#
#   tools/verify-template.sh [--keep]   --keep leaves the temp project in place, prints its path
set -euo pipefail

keep=false
case "${1:-}" in
  --keep) keep=true ;;
  '') ;;
  *)
    echo "usage: verify-template.sh [--keep]" >&2
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
node "$here/check-guidelines.mjs" "$plugin_root/references" \
  "$skills_root/project-setup/assets/app-template/CLAUDE.md"
bash "$plugin_root/evals/fixtures/check-detect.sh"

bash "$skills_root/project-setup/scripts/scaffold.sh" "$tmp/app" verify-app
if grep -rniI todo "$tmp/app"; then
  echo "verify: the fresh scaffold mentions todos (above); a new project carries no example feature" >&2
  exit 1
fi
# Install the plugin inside the project, as teams do: the app's gates must ignore .claude/.
# skills/, references/, scripts/ and agents/ keep their places, so `../../references` and
# `../../scripts` resolve from every skill.
mkdir -p "$tmp/app/.claude"
(cd "$plugin_root" && tar -cf - --exclude=node_modules --exclude=dist --exclude=coverage \
  --exclude=storybook-static skills references scripts agents) |
  (cd "$tmp/app/.claude" && tar -xf -)
cd "$tmp/app"
pnpm install --frozen-lockfile
pnpm check
# The commit rules the husky commit-msg hook enforces: a conventional message passes, others fail.
echo 'feat: verify the commit rules' | pnpm exec commitlint
if echo 'added stuff' | pnpm exec commitlint >/dev/null 2>&1; then
  echo "verify: commitlint accepted a non-conventional message" >&2
  exit 1
fi
# The PostToolUse hook formats the file Claude wrote, and nothing outside the project. Its command
# runs as Claude Code runs it: hook input on stdin, CLAUDE_PROJECT_DIR set.
hook="$(node -p "require('./.claude/settings.json').hooks.PostToolUse[0].hooks[0].command")"
unformatted='export const x = {a:1}'
echo "$unformatted" | tee src/hook-check.ts >"$tmp/outside.ts"
for f in "$PWD/src/hook-check.ts" "$tmp/outside.ts"; do
  printf '{"tool_input":{"file_path":"%s"}}' "$f" | CLAUDE_PROJECT_DIR="$PWD" bash -c "$hook"
done
pnpm exec prettier --check src/hook-check.ts
rm src/hook-check.ts
if [[ "$(cat "$tmp/outside.ts")" != "$unformatted" ]]; then
  echo "verify: the format hook changed a file outside the project" >&2
  exit 1
fi
echo "verify: fresh scaffold passed all gates, the commit rules and the format hook"

node "$here/extract-snippets.mjs" "$skills_root" "$tmp/app"
# core.autocrlf would turn the patched files to CRLF on Windows, and Prettier rejects that.
git -c core.autocrlf=false apply wiring.diff
rm wiring.diff
pnpm check
if [[ "$keep" == true ]]; then
  echo "verify: the quoted todos feature passed all gates too (kept at $tmp/app)"
else
  echo "verify: the quoted todos feature passed all gates too"
fi

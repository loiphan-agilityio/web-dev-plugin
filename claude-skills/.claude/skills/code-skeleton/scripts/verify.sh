#!/usr/bin/env bash
# Proves the template and the code the skills quote still pass every gate. Exits non-zero on the
# first failure.
#
# 1. Scaffolds the template into a temporary directory, copies the skills into its .claude/skills
#    (as a real project has them) and runs all five gates (lint, typecheck, test, build,
#    Storybook build), then checks the commit-message rules (commitlint).
# 2. Writes the todos feature quoted in the skills' markdown into that app (every block marked
#    `file=...`, see extract-snippets.mjs), applies its wiring diff and runs all five gates again.
#
#   verify.sh [--keep]     --keep leaves the temp project in place and prints its path
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

"$here/scaffold.sh" "$tmp/app" verify-app
# Install the skills inside the project, as teams do: the app's gates must ignore .claude/.
skills_root="$(cd "$here/../.." && pwd)"
mkdir -p "$tmp/app/.claude/skills"
for s in build-app code-skeleton develop-feature integrate-api design-to-ui; do
  [[ -d "$skills_root/$s" ]] || continue
  (cd "$skills_root" && tar -cf - --exclude=node_modules --exclude=dist "$s") | (cd "$tmp/app/.claude/skills" && tar -xf -)
done
cd "$tmp/app"
pnpm install --frozen-lockfile
pnpm check
# The commit rules the husky commit-msg hook enforces: a conventional message passes, others fail.
echo 'feat: verify the commit rules' | pnpm exec commitlint
if echo 'added stuff' | pnpm exec commitlint >/dev/null 2>&1; then
  echo "verify: commitlint accepted a non-conventional message" >&2
  exit 1
fi
echo "verify: fresh scaffold passed all gates and the commit rules"

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

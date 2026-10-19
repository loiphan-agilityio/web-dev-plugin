#!/usr/bin/env bash
# Scaffolds the template into a temporary directory, copies the skills into its .claude/skills
# (as a real project has them) and runs all four gates there (lint, typecheck, test, build). Exits non-zero on the first failing gate.
#
#   verify.sh [--keep]     --keep leaves the temp project in place and prints its path
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
tmp="$(mktemp -d)"
if [ "${1:-}" != "--keep" ]; then trap 'rm -rf "$tmp"' EXIT; fi

"$here/scaffold.sh" "$tmp/app" verify-app
# Install the skills inside the project, as teams do: the app's gates must ignore .claude/.
skills_root="$(cd "$here/../.." && pwd)"
mkdir -p "$tmp/app/.claude/skills"
for s in code-skeleton develop-feature integrate-api design-to-ui; do
  [ -d "$skills_root/$s" ] || continue
  (cd "$skills_root" && tar -cf - --exclude=node_modules --exclude=dist "$s") | (cd "$tmp/app/.claude/skills" && tar -xf -)
done
cd "$tmp/app"
pnpm install --frozen-lockfile
pnpm check
echo "verify: all gates passed${1:+ (kept at $tmp/app)}"

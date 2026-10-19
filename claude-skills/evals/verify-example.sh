#!/usr/bin/env bash
# Proves the todos fixture that develop-feature's references quote still works on a fresh scaffold:
# every code block in every skill is copied from the template or the fixture (check-quotes.mjs) →
# every fixture file is quoted in full → scaffold → copy the feature → apply wiring.diff → install →
# all four gates.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
example="$root/evals/fixtures/todos"
refs="$root/.claude/skills/develop-feature/references"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

node "$root/evals/check-quotes.mjs"

# The skill ships only references/; each fixture file must be quoted there verbatim.
mkdir -p "$tmp/blocks"
for r in "$refs"/*.md; do
  awk -v out="$tmp/blocks/$(basename "$r" .md)" '/^```/{if(inb){inb=0;close(f)}else{inb=1;f=out"-"++n};next} inb{print > f}' "$r"
done
while IFS= read -r f; do
  found=; for b in "$tmp/blocks"/*; do cmp -s "$example/$f" "$b" && { found=1; break; }; done
  [ -n "$found" ] || { echo "verify-example: $f is not quoted verbatim in develop-feature/references" >&2; exit 1; }
done < <(cd "$example" && find . -type f)

"$root/.claude/skills/code-skeleton/scripts/scaffold.sh" "$tmp/app" example-app
cp -r "$example/src/." "$tmp/app/src/"
(cd "$tmp/app" && git apply "$example/wiring.diff")
cd "$tmp/app"
pnpm install --frozen-lockfile
pnpm check
echo "verify-example: references match the todos fixture, and it passes all gates on a fresh scaffold"

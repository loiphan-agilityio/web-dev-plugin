#!/usr/bin/env bash
# Builds each fixture in a temporary directory and checks the tier detect-project.mjs gives it.
# Runs without network or an install; tools/verify.sh calls it.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
detect="$here/../../scripts/detect-project.mjs"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

tier_of() { node "$detect" "$1" | node -p 'JSON.parse(require("node:fs").readFileSync(0, "utf8")).tier'; }

failed=0
expect() {
  local name="$1" want="$2" got
  got="$(tier_of "$tmp/$name")"
  if [[ "$got" == "$want" ]]; then
    echo "  ok   $name: $got"
  else
    echo "  FAIL $name: $got, expected $want" >&2
    failed=1
  fi
}

mkdir -p "$tmp/empty/.git" "$tmp/other" "$tmp/template" "$tmp/same-stack" "$tmp/other-stack" "$tmp/vue" "$tmp/broken"
(cd "$tmp/other" && bash "$here/notes-folder.sh")
(cd "$tmp/template" && bash "$here/template-app.sh" >/dev/null)
(cd "$tmp/same-stack" && bash "$here/same-stack-app.sh")
(cd "$tmp/other-stack" && bash "$here/other-stack-app.sh")
(cd "$tmp/vue" && bash "$here/vue-app.sh")
(cd "$tmp/broken" && bash "$here/broken-app.sh")
# Folders only this check needs: a monorepo root that declares React, a React app behind an SSR
# framework, and a React range whose installed major matches the guidelines.
mkdir -p "$tmp/monorepo" "$tmp/remix" "$tmp/range/node_modules/react"
printf '{"workspaces":["apps/*"],"dependencies":{"react":"^19.3.1","vite":"^8.3.4"}}\n' \
  > "$tmp/monorepo/package.json"
printf '{"dependencies":{"react":"^19.3.1","@remix-run/react":"^2.15.0"}}\n' > "$tmp/remix/package.json"
printf '{"dependencies":{"react":">=18"}}\n' > "$tmp/range/package.json"
printf '{"version":"19.3.1"}\n' > "$tmp/range/node_modules/react/package.json"

echo "check-detect:"
expect empty new
expect other new
expect template template
expect same-stack same-stack
expect other-stack other-stack
expect vue unsupported
expect monorepo unsupported
expect remix unsupported

other_majors="$(node "$detect" "$tmp/range" | node -p 'JSON.parse(require("node:fs").readFileSync(0, "utf8")).otherMajors.length')"
if [[ "$other_majors" == 0 ]]; then
  echo "  ok   range: installed react 19 matches the guidelines"
else
  echo "  FAIL range: otherMajors has $other_majors entries, expected 0" >&2
  failed=1
fi

# A broken package.json and a missing folder are errors with their own exit codes, not tiers.
expect_exit() {
  local name="$1" want="$2" got=0
  node "$detect" "$tmp/$name" >/dev/null 2>&1 || got=$?
  if [[ "$got" == "$want" ]]; then
    echo "  ok   $name: exit $got"
  else
    echo "  FAIL $name: exit $got, expected $want" >&2
    failed=1
  fi
}
expect_exit broken 1
expect_exit missing 2
exit "$failed"

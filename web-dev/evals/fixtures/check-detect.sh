#!/usr/bin/env bash
# Builds each fixture in a temporary directory and checks the tier detect-project.mjs gives it.
# Clones the boilerplate for the template fixture (network), installs nothing; tools/verify.sh calls it.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
detect="$here/../../scripts/detect-project.mjs"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

failed=0
# expect_field <folder> <JavaScript expression on r, the parsed report> <value>
expect_field() {
  local name="$1" field="$2" want="$3" got
  got="$(node "$detect" "$tmp/$name" | node -p 'const r = JSON.parse(require("node:fs").readFileSync(0, "utf8")); eval(process.argv[1])' "$field")"
  if [[ "$got" == "$want" ]]; then
    echo "  ok   $name: $field is $got"
  else
    echo "  FAIL $name: $field is \"$got\", expected \"$want\"" >&2
    failed=1
  fi
}
expect() { expect_field "$1" r.tier "$2"; }

mkdir -p "$tmp/empty/.git" "$tmp/other" "$tmp/template" "$tmp/landing" "$tmp/same-stack" "$tmp/other-stack" "$tmp/vue" "$tmp/broken"
(cd "$tmp/other" && bash "$here/notes-folder.sh")
(cd "$tmp/template" && bash "$here/template-app.sh" >/dev/null)
(cd "$tmp/landing" && bash "$here/landing-app.sh" >/dev/null)
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
# Near misses for the landing tier, which needs every part: the boilerplate's UI kit with the data
# stack is no landing page, and neither is the UI kit without the test helpers.
mkdir -p "$tmp/ui-with-effect/src/test" "$tmp/ui-no-helpers"
printf '{"dependencies":{"react":"^19.3.1","@repo/ui":"workspace:*","effect":"^4.0.5","@tanstack/react-query":"^5.104.5","react-hook-form":"^7.90.0"},"devDependencies":{"vite":"^8.3.5"}}\n' \
  > "$tmp/ui-with-effect/package.json"
: > "$tmp/ui-with-effect/src/test/render.tsx"
printf '{"dependencies":{"react":"^19.3.1","@repo/ui":"workspace:*"},"devDependencies":{"vite":"^8.3.5"}}\n' \
  > "$tmp/ui-no-helpers/package.json"
# Workspace packages with no packageManager field and no lockfile of their own: the workspace root
# (pnpm-workspace.yaml, or package.json `workspaces`) holds the lockfile.
mkdir -p "$tmp/pnpm-ws/apps/web" "$tmp/yarn-ws/packages/app"
printf 'packages:\n  - apps/*\n' > "$tmp/pnpm-ws/pnpm-workspace.yaml"
: > "$tmp/pnpm-ws/pnpm-lock.yaml"
printf '{"dependencies":{"react":"^19.3.1"}}\n' > "$tmp/pnpm-ws/apps/web/package.json"
printf '{"workspaces":["packages/*"]}\n' > "$tmp/yarn-ws/package.json"
: > "$tmp/yarn-ws/yarn.lock"
printf '{"dependencies":{"react":"^19.3.1"}}\n' > "$tmp/yarn-ws/packages/app/package.json"
# pnpm catalogs on another major, so reading them shows in otherMajors: a column-0 comment inside
# `catalog:`, the `catalogs:` form with `default` and a named catalog, and a catalog that names
# nothing in the workspace file (no version known: left out).
mkdir -p "$tmp/catalog-comment/app" "$tmp/catalogs/app" "$tmp/catalog-unknown/app"
printf 'packages:\n  - app\ncatalog:\n  vite: ^8.3.4\n# React stays on 18 here\n  react: ^18.3.1\n' \
  > "$tmp/catalog-comment/pnpm-workspace.yaml"
printf '{"dependencies":{"react":"catalog:","vite":"catalog:"}}\n' > "$tmp/catalog-comment/app/package.json"
printf 'packages:\n  - app\ncatalogs:\n  default:\n    react: ^18.3.1\n\n  legacy:\n    typescript: ~5.9.3\n' \
  > "$tmp/catalogs/pnpm-workspace.yaml"
printf '{"dependencies":{"react":"catalog:"},"devDependencies":{"typescript":"catalog:legacy"}}\n' \
  > "$tmp/catalogs/app/package.json"
printf 'packages:\n  - app\n' > "$tmp/catalog-unknown/pnpm-workspace.yaml"
printf '{"dependencies":{"react":"catalog:stable"}}\n' > "$tmp/catalog-unknown/app/package.json"

echo "check-detect:"
expect empty new
expect other new
expect template/apps/web template
expect template unsupported
expect landing/apps/web landing
expect ui-with-effect same-stack
expect ui-no-helpers other-stack
expect same-stack same-stack
expect other-stack other-stack
expect vue unsupported
expect monorepo unsupported
expect remix unsupported

# Installed react 19 matches the guidelines.
expect_field range 'r.otherMajors.join("; ")' ""
# Not installed: react, typescript and tailwindcss are `catalog:`, pinned in pnpm-workspace.yaml.
expect_field template/apps/web 'r.otherMajors.join("; ")' ""
# An unresolved catalog:stable is not reported.
expect_field catalog-unknown/app 'r.otherMajors.join("; ")' ""
expect_field catalog-comment/app 'r.otherMajors.join("; ")' "react ^18.3.1 (guidelines: 19)"
expect_field catalogs/app 'r.otherMajors.join("; ")' \
  "react ^18.3.1 (guidelines: 19); typescript ~5.9.3 (guidelines: 6)"

expect_field pnpm-ws/apps/web r.packageManager pnpm
expect_field yarn-ws/packages/app r.packageManager yarn

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
expect_exit broken/package.json 2
exit "$failed"

#!/usr/bin/env bash
# Builds each fixture in a temporary directory and checks the tier detect-project.mjs gives it.
# Clones the boilerplate for the template fixture (network), installs nothing; tools/verify.sh calls it.
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
expect same-stack same-stack
expect other-stack other-stack
expect vue unsupported
expect monorepo unsupported
expect remix unsupported

expect_no_other_majors() {
  local name="$1" why="$2" other_majors
  other_majors="$(node "$detect" "$tmp/$name" | node -p 'JSON.parse(require("node:fs").readFileSync(0, "utf8")).otherMajors.length')"
  if [[ "$other_majors" == 0 ]]; then
    echo "  ok   $name: $why"
  else
    echo "  FAIL $name: otherMajors has $other_majors entries, expected 0" >&2
    failed=1
  fi
}
expect_no_other_majors range "installed react 19 matches the guidelines"
# Not installed: react, typescript and tailwindcss are `catalog:`, pinned in pnpm-workspace.yaml.
expect_no_other_majors template/apps/web "the boilerplate's catalog: versions match the guidelines"
expect_no_other_majors catalog-unknown/app "an unresolved catalog:stable is not reported"

expect_other_majors() {
  local name="$1" want="$2" got
  got="$(node "$detect" "$tmp/$name" | node -p 'JSON.parse(require("node:fs").readFileSync(0, "utf8")).otherMajors.join("; ")')"
  if [[ "$got" == "$want" ]]; then
    echo "  ok   $name: otherMajors $got"
  else
    echo "  FAIL $name: otherMajors \"$got\", expected \"$want\"" >&2
    failed=1
  fi
}
expect_other_majors catalog-comment/app "react ^18.3.1 (guidelines: 19)"
expect_other_majors catalogs/app "react ^18.3.1 (guidelines: 19); typescript ~5.9.3 (guidelines: 6)"

expect_package_manager() {
  local name="$1" want="$2" got
  got="$(node "$detect" "$tmp/$name" | node -p 'JSON.parse(require("node:fs").readFileSync(0, "utf8")).packageManager')"
  if [[ "$got" == "$want" ]]; then
    echo "  ok   $name: package manager $got"
  else
    echo "  FAIL $name: package manager $got, expected $want" >&2
    failed=1
  fi
}
expect_package_manager pnpm-ws/apps/web pnpm
expect_package_manager yarn-ws/packages/app yarn

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

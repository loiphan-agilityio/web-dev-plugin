#!/usr/bin/env bash
# Writes a CI pipeline that installs the project from its lockfile and runs its whole unit-test
# suite (the `test` script) on every push, with the project's own package manager.
#
#   setup-ci.sh <project-dir> github|gitlab
#
# The host is the user's answer, never guessed from the remotes. github writes
# .github/workflows/unit-tests.yml, gitlab writes .gitlab-ci.yml, both at the root of the git
# repository holding the project (the hosts read nothing from a subfolder); the job then runs in
# the project's folder.
# Exits 0 when the file is written; 1 when it refuses (no `test` script, no lockfile, a package
# manager other than pnpm, npm or yarn, or the file exists: then the pipeline it would write goes
# to stdout and the file stays as it is); 2 on a wrong argument, no package.json, or a failed
# project detection.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dir="${1:-}"
host="${2:-}"
if [[ -z "$dir" || ! "$host" =~ ^(github|gitlab)$ ]]; then
  echo "usage: setup-ci.sh <project-dir> github|gitlab" >&2
  exit 2
fi
if [[ ! -f "$dir/package.json" ]]; then
  echo "setup-ci: no package.json in $dir" >&2
  exit 2
fi
dir="$(cd "$dir" && pwd -P)"

if ! profile="$(node "$here/../../../scripts/detect-project.mjs" "$dir")"; then
  echo "setup-ci: project detection failed (above); nothing was written" >&2
  exit 2
fi
field() { node -e 'const j=JSON.parse(process.argv[1]); const v=j[process.argv[2]]; console.log(Array.isArray(v) ? v.join(" ") : v ?? "")' "$profile" "$1"; }
pm="$(field packageManager)"

refuse() {
  echo "setup-ci: $1; nothing was written" >&2
  exit 1
}
[[ " $(field scripts) " == *" test "* ]] || refuse "package.json has no \"test\" script"
case "$pm" in
  pnpm) lock=pnpm-lock.yaml install='pnpm install --frozen-lockfile' ;;
  npm) lock=package-lock.json install='npm ci' ;;
  yarn) lock=yarn.lock install='yarn install --frozen-lockfile' ;;
  *) refuse "package manager $pm is not supported yet (pnpm, npm or yarn)" ;;
esac
# CI installs exactly what the lockfile pins; without one every run may resolve other versions.
[[ -f "$dir/$lock" ]] || refuse "no $lock: run $pm install and commit the lockfile first"

root="$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null || echo "$dir")"
root="$(cd "$root" && pwd -P)"
rel="${dir#"$root"}"
rel="${rel#/}"

github() {
  cat <<YAML
# Runs the whole unit-test suite on every push and pull request.
name: Unit tests
on: [push, pull_request]
permissions:
  contents: read
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    # Node 24 ships corepack, which provides the pnpm or yarn version package.json pins.
    container: node:24
YAML
  if [[ -n "$rel" ]]; then
    printf '    defaults:\n      run:\n        working-directory: %s\n' "$rel"
  fi
  cat <<YAML
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - run: corepack enable
      - run: $install
      - run: $pm test
YAML
}

gitlab() {
  cat <<YAML
# Runs the whole unit-test suite on every push; merge requests show their branch's pipeline.
unit-tests:
  # Node 24 ships corepack, which provides the pnpm or yarn version package.json pins.
  image: node:24
  before_script:
YAML
  if [[ -n "$rel" ]]; then
    printf '    - cd %s\n' "$rel"
  fi
  cat <<YAML
    - corepack enable
    - $install
  script:
    - $pm test
YAML
}

case "$host" in
  github) out="$root/.github/workflows/unit-tests.yml" ;;
  gitlab) out="$root/.gitlab-ci.yml" ;;
esac
if [[ -e "$out" ]]; then
  "$host"
  refuse "$out already exists (the pipeline it would get is above)"
fi
mkdir -p "$(dirname "$out")"
"$host" >"$out"
echo "setup-ci: wrote $out ($host): $install, then $pm test${rel:+, in $rel/}"

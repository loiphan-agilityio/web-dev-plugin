#!/usr/bin/env bash
# Checks what ci-setup's setup-ci.sh writes and refuses, on small projects in a temporary
# directory. Runs without network or an install; tools/verify.sh calls it, and then writes
# both pipelines into a project from the boilerplate.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
setup="$here/../web-dev/skills/ci-setup/scripts/setup-ci.sh"
fixtures="$here/../web-dev/evals/fixtures"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

failed=0
ok() { echo "  ok   $1"; }
fail() {
  echo "  FAIL $1" >&2
  failed=1
}
# expect <name> <exit code> <file that must hold the pattern, or -> <pattern> -- <setup-ci args>
expect() {
  local name="$1" want="$2" file="$3" pattern="$4" got=0
  shift 5
  bash "$setup" "$@" >"$tmp/out" 2>&1 || got=$?
  if [[ "$got" != "$want" ]]; then
    fail "$name: exit $got, expected $want: $(cat "$tmp/out")"
  elif [[ "$file" != - ]] && ! grep -q -- "$pattern" "$file"; then
    fail "$name: $file lacks '$pattern': $(cat "$file")"
  else
    ok "$name"
  fi
}

mkdir -p "$tmp/template" "$tmp/other-stack" "$tmp/npm" "$tmp/no-test"
(cd "$tmp/template" && bash "$fixtures/template-app.sh" >/dev/null)
(cd "$tmp/other-stack" && bash "$fixtures/other-stack-app.sh")
printf '{"scripts":{"test":"vitest run"}}\n' >"$tmp/npm/package.json"
printf '{}\n' >"$tmp/npm/package-lock.json"
printf '{"scripts":{"build":"vite build"}}\n' >"$tmp/no-test/package.json"
touch "$tmp/no-test/package-lock.json"
# A project in a subfolder of a git repository: the file goes to the repository root and the job
# runs in app/.
git init -q "$tmp/gh"
mkdir -p "$tmp/gh/app"
printf '{"packageManager":"pnpm@11.17.0","scripts":{"test":"vitest run"}}\n' >"$tmp/gh/app/package.json"
touch "$tmp/gh/app/pnpm-lock.yaml"

github=.github/workflows/unit-tests.yml
echo "check-ci-setup:"
expect template-github 0 "$tmp/template/$github" 'run: pnpm install --frozen-lockfile' -- "$tmp/template" github
expect template-gitlab 0 "$tmp/template/.gitlab-ci.yml" '    - pnpm test' -- "$tmp/template" gitlab
expect existing-kept 1 "$tmp/out" 'run: pnpm test' -- "$tmp/template" github
expect subfolder-root 0 "$tmp/gh/$github" 'working-directory: app' -- "$tmp/gh/app" github
expect npm 0 "$tmp/npm/.gitlab-ci.yml" '    - npm ci' -- "$tmp/npm" gitlab
expect no-host-given 2 "$tmp/out" 'usage:' -- "$tmp/npm"
expect no-lockfile 1 "$tmp/out" 'no package-lock.json' -- "$tmp/other-stack" github
expect no-test-script 1 "$tmp/out" 'no "test" script' -- "$tmp/no-test" github
expect no-package-json 2 - - -- "$tmp/gh" github
for written in "$tmp/gh/app/.github" "$tmp/other-stack/.github" "$tmp/no-test/.github"; do
  [[ ! -e "$written" ]] || fail "wrote $written, which belongs only at the repository root or not at all"
done
exit "$failed"

#!/usr/bin/env bash
# Runs the quality gates a project actually has, with its own package manager, and reports the
# ones it lacks instead of inventing them. For a project without a `check` script (tiers
# `same-stack` and `other-stack`); an app from the boilerplate runs `pnpm check`.
#
#   verify-project.sh [dir]     dir defaults to the current directory
#
# Runs the `check` script when there is one, else lint, typecheck, test and build in that order.
# Every gate runs even after one fails, so the report is complete. Exits 1 if any gate failed, 2
# if nothing could be verified (no package.json, detect-project.mjs failed, or no gate script).
set -uo pipefail

# Resolved before the cd below, so a relative path to this script still finds its sibling.
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dir="${1:-.}"
cd "$dir" || exit 2
if [[ ! -f package.json ]]; then
  echo "verify-project: no package.json in $(pwd)" >&2
  exit 2
fi

# A failed detection (a broken package.json) means nothing was verified, which is not a pass.
if ! profile="$(node "$here/detect-project.mjs" .)"; then
  echo "verify-project: project detection failed (above); nothing was verified" >&2
  exit 2
fi
field() { node -e 'const j=JSON.parse(process.argv[1]); const v=j[process.argv[2]]; console.log(Array.isArray(v) ? v.join(" ") : v ?? "")' "$profile" "$1"; }
if ! pm="$(field packageManager)" || [[ -z "$pm" ]]; then
  echo "verify-project: no package manager in the detection output; nothing was verified" >&2
  exit 2
fi
read -r -a scripts <<< "$(field scripts)"

has_script() {
  local s
  # A package.json without scripts leaves the array empty; bash 3.2 (macOS) with `set -u` aborts
  # on a bare "${scripts[@]}" then, so expand it only when it has elements.
  for s in ${scripts[@]+"${scripts[@]}"}; do
    [[ "$s" == "$1" ]] && return 0
  done
  return 1
}

if has_script check; then
  gates=(check)
else
  gates=(lint typecheck test build)
fi

passed=()
failed=()
missing=()
for gate in "${gates[@]}"; do
  if ! has_script "$gate"; then
    missing+=("$gate")
    continue
  fi
  echo "→ $pm run $gate"
  # CI=true keeps test runners (Vitest, Jest) out of watch mode.
  if CI=true "$pm" run "$gate"; then
    passed+=("$gate")
  else
    failed+=("$gate")
  fi
done

echo
echo "verify-project: package manager $pm"
echo "  passed:  ${passed[*]:-none}"
echo "  failed:  ${failed[*]:-none}"
if has_script check; then
  # `check` may or may not cover these; the report names the ones with no script of their own.
  undeclared=()
  for gate in lint typecheck test build; do
    has_script "$gate" || undeclared+=("$gate")
  done
  echo "  no own script: ${undeclared[*]:-none} (only \`check\` ran: read it to see what it covers)"
else
  echo "  missing: ${missing[*]:-none} (no such script in package.json)"
fi
if (( ${#passed[@]} + ${#failed[@]} == 0 )); then
  echo "verify-project: the project has none of these gates; nothing was verified" >&2
  exit 2
fi
(( ${#failed[@]} == 0 ))

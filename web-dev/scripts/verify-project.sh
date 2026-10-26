#!/usr/bin/env bash
# Runs the quality gates a project actually has, with its own package manager, and reports the
# ones it lacks instead of inventing them. For a project not made from the boilerplate (tiers
# `same-stack` and `other-stack`); an app from the boilerplate runs `pnpm check:report`.
#
#   verify-project.sh [dir]     dir defaults to the current directory
#
# Runs the project's own `check` when it has one (it usually runs the other gates itself, and a
# `test` script may be a watch mode meant for a terminal), else lint, typecheck, test and build in
# that order, each one the project has a script for. Every gate runs even after one fails, so the
# report is complete. It ends with a checklist in the shape of the boilerplate's
# `pnpm check:report`: one row per gate, the unit tests' pass rate read from the runner's summary
# (Vitest, Jest, Mocha) in the output of `test` or `check`, and the gates the project has no script
# for. Exits 1 if any gate failed, 2 if nothing could be verified (no package.json,
# detect-project.mjs failed, or no gate script).
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

# The unit tests' pass rate from the runners' summary lines, as check:report writes it
# (`97.5% (39/40 passed)`); skipped and todo tests count in neither number. A monorepo prints one
# summary per package, often behind a prefix (`web:test: `), so every summary is summed. Empty when
# no summary is found.
pass_rate() {
  # shellcheck disable=SC2016 # JavaScript template literals, not shell expansions.
  node -e '
    const text = require("fs").readFileSync(process.argv[1], "utf8").replace(/\x1b\[[0-9;]*m/g, "");
    const n = (line, re) => Number(re.exec(line)?.[1] ?? 0);
    const rate = (passed, total) =>
      total === 0 ? "no tests" : `${Math.round((passed / total) * 1000) / 10}% (${passed}/${total} passed)`;
    const lines = text.split("\n");
    // Vitest: "Tests  39 passed | 1 failed (40)"; Jest: "Tests:  1 failed, 39 passed, 40 total".
    const tests = lines.filter((line) => /(?:^|[\s:])Tests:?\s+\d+ (?:passed|failed|skipped|todo|total)\b/.test(line));
    // Mocha: "39 passing" and "1 failing" on lines of their own.
    const passing = lines.filter((line) => /(?:^|[\s:])\d+ passing\b/.test(line));
    let passed = 0;
    let total = 0;
    for (const line of tests) {
      passed += n(line, /(\d+) passed/);
      total += (n(line, /(\d+) total/) || n(line, /\((\d+)\)/)) - n(line, /(\d+) skipped/) - n(line, /(\d+) todo/);
    }
    if (!tests.length) {
      for (const line of passing) passed += n(line, /(\d+) passing\b/);
      total = passed + lines.reduce((sum, line) => sum + n(line, /(?:^|[\s:])(\d+) failing\b/), 0);
    }
    if (tests.length || passing.length) console.log(rate(passed, total));
  ' "$1"
}

# A function, not an associative array: bash 3.2 (macOS) has none.
name() {
  case "$1" in
    lint) echo Lint ;; typecheck) echo Typecheck ;; test) echo "Unit tests" ;;
    build) echo Build ;; check) echo Check ;;
  esac
}
gates=()
missing=()
if has_script check; then
  gates=(check)
else
  for gate in lint typecheck test build; do
    if has_script "$gate"; then gates+=("$gate"); else missing+=("$gate"); fi
  done
fi

log="$(mktemp)"
trap 'rm -f "$log"' EXIT
rows=()
failed=()
# Guarded like `scripts`: `gates` is empty when the project has none of these scripts.
for gate in ${gates[@]+"${gates[@]}"}; do
  echo "→ $pm run $gate"
  start=$SECONDS
  # CI=true keeps test runners (Vitest, Jest) out of watch mode. tee keeps the output on screen;
  # pipefail gives the gate's own status.
  if CI=true "$pm" run "$gate" 2>&1 | tee "$log"; then ok=1; else ok=0; fi
  seconds=$((SECONDS - start))
  result=""
  [[ "$gate" == test || "$gate" == check ]] && result="$(pass_rate "$log")"
  if (( ok )); then
    rows+=("| $(name "$gate") | pass | ${result:-pass} | ${seconds}s |")
  else
    failed+=("$(name "$gate")")
    rows+=("| $(name "$gate") | FAIL | FAIL${result:+: $result} | ${seconds}s |")
  fi
done
for gate in "${missing[@]+"${missing[@]}"}"; do
  rows+=("| $(name "$gate") | missing | no \`$gate\` script in package.json | – |")
done

echo
echo "## Check report"
echo
echo "Package manager: $pm"
echo
echo "| Gate | Status | Result | Time |"
echo "|---|---|---|---|"
printf '%s\n' "${rows[@]+"${rows[@]}"}"
echo
if (( ${#gates[@]} == 0 )); then
  echo "verify-project: the project has none of these gates; nothing was verified" >&2
  exit 2
fi
lacks="${missing[*]+; missing: ${missing[*]}}"
if [[ "${gates[0]}" == check ]]; then
  echo "Only \`check\` ran, in place of lint, typecheck, test and build: read it to see which it covers."
fi
plural="gates"
(( ${#gates[@]} == 1 )) && plural="gate"
if (( ${#failed[@]} == 0 )); then
  if (( ${#gates[@]} == 1 )); then echo "1 gate passes${lacks}."; else echo "All ${#gates[@]} gates pass${lacks}."; fi
else
  joined="$(printf '%s, ' "${failed[@]}")"
  echo "${#failed[@]} of ${#gates[@]} $plural failed: ${joined%, }${lacks}."
  exit 1
fi

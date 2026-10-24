#!/usr/bin/env bash
# Runs the eval suite against a clean copy of the plugin. `claude plugin eval` on a plugin folder
# that holds a node_modules fails with E2BIG, so this copies the plugin without local output and
# runs the copy.
#
#   evals/run.sh [claude plugin eval options...]
#
# Every run is paid model time, so evals are the last step of a release, run once on finished
# work. Before spending anything, this script refuses:
#   - a single case (--case): one case proves nothing about routing; the release run covers it;
#   - uncommitted changes under web-dev/ or tools/: the skills are not finished;
#   - plugin content already evaluated with the same options (delete that results folder to rerun):
#     the key is a hash of skills/, agents/, references/, scripts/ and evals/ without READMEs, so a
#     commit that only edits docs or bumps the version does not pay for the same evals again;
#   - work that fails the free checks (tools/verify.sh); CI sets EVALS_CHECKS_DONE=1
#     because its eval jobs run only after those jobs passed.
# It adds --max-cost-usd 30 when no cap is given, and --ablation none (one arm, half the cost)
# unless --ablation with-without asks for the no-plugin baseline and its Δ: pass that only when a
# release changes a skill's description or develop's routing.
#
# Defaults: --scaffold (the cases' setup.sh only writes fixture files) and the tools the skills
# need. Anything passed is added after them, e.g.
#   evals/run.sh --tag routing --no-publish
# Results land in evals/results/<timestamp>/ of this checkout (ignored by git).
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
plugin_root="$(cd "$here/.." && pwd)"
repo="$(cd "$plugin_root/.." && pwd)"

has_cap=false
has_ablation=false
for arg in "$@"; do
  case "$arg" in
    --case | --case=*)
      echo "run.sh: no single-case runs; fix the skill, and the next release run checks every case" >&2
      exit 2
      ;;
    --max-cost-usd | --max-cost-usd=*) has_cap=true ;;
    --ablation | --ablation=*) has_ablation=true ;;
  esac
done

if [[ -n "$(git -C "$repo" status --porcelain -- web-dev tools)" ]]; then
  echo "run.sh: uncommitted changes under web-dev/ or tools/; evals run on finished, committed work" >&2
  exit 2
fi

# What the evals exercise, as committed; docs and the version do not count.
content="$(git -C "$repo" ls-tree -r HEAD -- web-dev/skills web-dev/agents web-dev/references \
  web-dev/scripts web-dev/evals | grep -v 'README\.md$' | git hash-object --stdin)"
run_key="$content $*"
for done_run in "$here"/results/*/run.txt; do
  if [[ -f "$done_run" && "$(cat "$done_run")" == "$run_key" ]]; then
    echo "run.sh: this plugin content was already evaluated with these options" \
      "($(dirname "$done_run")); delete that folder to run again" >&2
    exit 2
  fi
done

if [[ "${EVALS_CHECKS_DONE:-}" != 1 ]]; then
  echo "run.sh: free checks first (tools/verify.sh)"
  bash "$repo/tools/verify.sh"
fi

defaults=()
if [[ "$has_cap" == false ]]; then
  defaults+=(--max-cost-usd 30)
fi
if [[ "$has_ablation" == false ]]; then
  defaults+=(--ablation none)
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

(cd "$plugin_root" && tar -cf - --exclude=node_modules --exclude=dist --exclude=coverage \
  --exclude=storybook-static --exclude=evals/results .) | (mkdir -p "$tmp/web-dev" && cd "$tmp/web-dev" && tar -xf -)

out="$here/results/$(date -u +%Y-%m-%dT%H-%M-%SZ)"
mkdir -p "$out"
echo "$run_key" > "$out/run.txt"
# ${defaults[@]+...}: empty when both options were given, and bash 3.2 (macOS) with `set -u`
# aborts on a bare "${defaults[@]}" of an empty array.
claude plugin eval "$tmp/web-dev" --scaffold --allow-tools Bash Write Edit \
  --output-dir "$out" --report "$out/report.html" ${defaults[@]+"${defaults[@]}"} "$@"

#!/usr/bin/env bash
# Runs the web-quality eval suite against a clean copy of the plugin, with the same spending guards
# as web-dev's evals/run.sh: no single case (--case), no uncommitted changes under web-quality/,
# the free checks first (the scripts' tests), a cost cap and one arm unless asked otherwise.
#
#   evals/run.sh [claude plugin eval options...]
#
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
      echo "run.sh: no single-case runs; fix the skill, and the next requested run checks every case" >&2
      exit 2
      ;;
    --max-cost-usd | --max-cost-usd=*) has_cap=true ;;
    --ablation | --ablation=*) has_ablation=true ;;
  esac
done

if [[ -n "$(git -C "$repo" status --porcelain -- web-quality)" ]]; then
  echo "run.sh: uncommitted changes under web-quality/; evals run on finished, committed work" >&2
  exit 2
fi

echo "run.sh: free checks first (the scripts' tests)"
node --test "$plugin_root"/scripts/test/*.test.mjs

defaults=()
if [[ "$has_cap" == false ]]; then
  defaults+=(--max-cost-usd 15)
fi
if [[ "$has_ablation" == false ]]; then
  defaults+=(--ablation none)
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
(cd "$plugin_root" && tar -cf - --exclude=evals/results .) |
  (mkdir -p "$tmp/web-quality" && cd "$tmp/web-quality" && tar -xf -)

out="$here/results/$(date -u +%Y-%m-%dT%H-%M-%SZ)"
mkdir -p "$out"
# ${defaults[@]+...}: bash 3.2 (macOS) with `set -u` aborts on a bare "${defaults[@]}" when empty.
claude plugin eval "$tmp/web-quality" --scaffold --allow-tools Bash \
  --output-dir "$out" --report "$out/report.html" ${defaults[@]+"${defaults[@]}"} "$@"

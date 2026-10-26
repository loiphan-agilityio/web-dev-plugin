#!/usr/bin/env bash
# Runs a plugin's model evals (`claude plugin eval`) on a copy of it without its earlier results.
# Every run is paid model time, so evals run only on the maintainer's machine (never in CI), only
# when the maintainer asks for a run, and last: after every free check, on a finished release.
#
#   tools/run-evals.sh <web-dev|web-quality> [claude plugin eval options...]
#
# Each plugin's evals/run.sh calls it with its name. Before spending anything it refuses, cheapest
# check first:
#   - a single case (--case): one case proves nothing; the next requested run checks every case;
#   - uncommitted changes under <plugin>/ or tools/: the skills are not finished;
#   - a HEAD that is not the plugin's release commit (the tag <plugin>--v<version>, the version in
#     its .claude-plugin/plugin.json): evals judge a finished release, not work in progress;
#   - plugin content already evaluated with the same options (delete that results folder to run
#     again after an infrastructure failure): the key hashes the committed skills/, agents/,
#     references/, scripts/ and evals/ without READMEs, so a change to docs only pays nothing again;
#   - work that fails a free check: `pnpm lint`, tools/validate-skills.sh, the plugin's script
#     tests and, for web-dev, tools/verify.sh.
# Then it caps the cost (--max-cost-usd 30 for web-dev, 15 for web-quality, unless one is given)
# and runs one arm (--ablation none) unless --ablation with-without asks for the no-plugin
# baseline and its Δ: pass that only when a change touches a skill's description or the routing.
# Results land in <plugin>/evals/results/<timestamp>/ (ignored by git).
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
usage="usage: tools/run-evals.sh <web-dev|web-quality> [claude plugin eval options...]"
plugin="${1:-}"
case "$plugin" in
  web-dev)
    cap=30
    tools=(Bash Write Edit)
    ;;
  web-quality)
    cap=15
    tools=(Bash)
    ;;
  *)
    echo "$usage" >&2
    exit 2
    ;;
esac
shift
plugin_root="$repo/$plugin"

has_cap=false
has_ablation=false
for arg in "$@"; do
  case "$arg" in
    --case | --case=*)
      echo "run-evals: no single-case runs; fix the skill, and the next requested run checks every case" >&2
      exit 2
      ;;
    --max-cost-usd | --max-cost-usd=*) has_cap=true ;;
    --ablation | --ablation=*) has_ablation=true ;;
  esac
done

if [[ -n "$(git -C "$repo" status --porcelain -- "$plugin" tools)" ]]; then
  echo "run-evals: uncommitted changes under $plugin/ or tools/; evals run on finished, committed work" >&2
  exit 2
fi

version="$(node -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).version' \
  "$plugin_root/.claude-plugin/plugin.json")"
tag="$plugin--v$version"
if [[ "$(git -C "$repo" rev-parse -q --verify "refs/tags/$tag^{commit}" || true)" != \
  "$(git -C "$repo" rev-parse HEAD)" ]]; then
  echo "run-evals: HEAD is not the release commit $tag; evals run last, on a finished release" >&2
  exit 2
fi

# What the evals exercise, as committed; docs and the version do not count.
content="$(git -C "$repo" ls-tree -r HEAD -- "$plugin/skills" "$plugin/agents" \
  "$plugin/references" "$plugin/scripts" "$plugin/evals" | grep -v 'README\.md$' |
  git hash-object --stdin)"
run_key="$content $*"
for done_run in "$plugin_root"/evals/results/*/run.txt; do
  if [[ -f "$done_run" && "$(cat "$done_run")" == "$run_key" ]]; then
    echo "run-evals: this plugin content was already evaluated with these options" \
      "($(dirname "$done_run")); delete that folder to run again" >&2
    exit 2
  fi
done

echo "run-evals: free checks first"
(cd "$repo" && pnpm lint)
bash "$repo/tools/validate-skills.sh"
node --test "$plugin_root"/scripts/test/*.test.mjs
if [[ "$plugin" == web-dev ]]; then
  bash "$repo/tools/verify.sh"
fi

defaults=()
if [[ "$has_cap" == false ]]; then
  defaults+=(--max-cost-usd "$cap")
fi
if [[ "$has_ablation" == false ]]; then
  defaults+=(--ablation none)
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
(cd "$plugin_root" && tar -cf - --exclude=evals/results .) |
  (mkdir -p "$tmp/$plugin" && cd "$tmp/$plugin" && tar -xf -)

out="$plugin_root/evals/results/$(date -u +%Y-%m-%dT%H-%M-%SZ)"
mkdir -p "$out"
echo "$run_key" >"$out/run.txt"
# ${defaults[@]+...}: empty when both options were given, and bash 3.2 (macOS) with `set -u`
# aborts on a bare "${defaults[@]}" of an empty array.
claude plugin eval "$tmp/$plugin" --scaffold --allow-tools "${tools[@]}" \
  --output-dir "$out" --report "$out/report.html" ${defaults[@]+"${defaults[@]}"} "$@"

#!/usr/bin/env bash
# Runs skill evals as parallel headless Claude Code sessions, one temp project per run.
#
#   run-evals.sh <config> <eval>...     config: full | skills | none
#                                       eval: skeleton | feature | api | design | skeleton-baseline (use with none)
#
#   full    our 4 skills + the 8 companions      skills  our 4 skills only      none  no skills (baseline)
#
# Env: EVAL_MODEL (default sonnet), EVAL_EFFORT (medium), EVAL_PERMISSION_MODE (acceptEdits), EVAL_BUDGET (USD per run, default 3),
#      EVAL_MAX_TURNS (120), CLAUDE_BIN (claude on PATH, else the VS Code extension's binary).
# Output: evals/runs/<timestamp>/<eval>-<config>/{app/,events.jsonl,stderr.log}; then run grade.sh.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
skills="$root/.claude/skills"
config="${1:?usage: run-evals.sh <full|skills|none> <eval>...}"; shift
[ $# -gt 0 ] || { echo "name at least one eval: skeleton feature api design" >&2; exit 1; }
claude_bin="${CLAUDE_BIN:-$(command -v claude || ls -d "$HOME"/.vscode/extensions/anthropic.claude-code-*/resources/native-binary/claude 2>/dev/null | sort -V | tail -1)}"
[ -x "$claude_bin" ] || { echo "claude binary not found; set CLAUDE_BIN" >&2; exit 1; }

out="$root/evals/runs/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$out"

prepare() { # <eval> <dir>
  local eval="$1" dir="$2"
  mkdir -p "$dir/app"
  if [ "${eval%%-*}" != skeleton ]; then
    "$skills/code-skeleton/scripts/scaffold.sh" "$dir/app" eval-app >/dev/null
    if [ "$eval" = api ]; then
      cp -r "$root/evals/fixtures/todos/src/." "$dir/app/src/"
      (cd "$dir/app" && git apply "$root/evals/fixtures/todos/wiring.diff")
    fi
    (cd "$dir/app" && pnpm install --frozen-lockfile --silent)
  fi
  # Before the baseline commit, so the mockup is part of it.
  if [ "$eval" = design ]; then
    mkdir -p "$dir/app/design" && cp "$root/evals/fixtures/designs/notes.png" "$dir/app/design/notes.png"
  fi
  if [ "$config" != none ]; then
    mkdir -p "$dir/app/.claude/skills"
    for s in code-skeleton develop-feature integrate-api design-to-ui; do
      (cd "$skills" && tar -cf - --exclude=node_modules "$s") | (cd "$dir/app/.claude/skills" && tar -xf -)
    done
    if [ "$config" = full ] && [ "${eval%%-*}" != skeleton ]; then
      # For skeleton, installing companions is part of what the skill must do.
      (cd "$dir/app" && "$skills/code-skeleton/scripts/install-companions.sh" >/dev/null 2>&1)
    fi
  fi
  (cd "$dir/app" && git init -q && git add -A >/dev/null 2>&1 && git -c user.name=eval -c user.email=eval@local commit -qm baseline --allow-empty)
}

pids=()
for eval in "$@"; do
  dir="$out/$eval-$config"
  prepare "$eval" "$dir"
  (
    cd "$dir/app"
    "$claude_bin" -p "$(cat "$root/evals/prompts/$eval.md")" \
      --model "${EVAL_MODEL:-sonnet}" --effort "${EVAL_EFFORT:-medium}" \
      --permission-mode "${EVAL_PERMISSION_MODE:-acceptEdits}" --permission-prompts none \
      --allowedTools "Bash(pnpm *),Bash(npx *),Bash(node *),Bash(git *),Bash(bash *),Bash(./*),Bash(.claude/*),Bash(chmod *),Read,Edit,Write,Glob,Grep,Skill" \
      --setting-sources project \
      --max-turns "${EVAL_MAX_TURNS:-120}" --max-budget-usd "${EVAL_BUDGET:-3}" \
      --no-session-persistence --output-format stream-json --verbose \
      > "$dir/events.jsonl" 2> "$dir/stderr.log"
  ) &
  pids+=($!)
  echo "started $eval-$config → $dir"
done
for p in "${pids[@]}"; do wait "$p" || true; done
echo "done: $out"
echo "grade with: $root/evals/grade.sh $out"

#!/usr/bin/env bash
# Checks which skill (if any) Claude invokes for short prompts, in a scaffolded project that has
# the four skills installed. Sessions are capped at 3 turns and can only read and invoke skills,
# so they cost cents. Prints: expected | invoked | prompt.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
claude_bin="${CLAUDE_BIN:-$(command -v claude || ls -d "$HOME"/.vscode/extensions/anthropic.claude-code-*/resources/native-binary/claude 2>/dev/null | sort -V | tail -1)}"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
"$root/.claude/skills/code-skeleton/scripts/scaffold.sh" "$tmp/app" trigger-app >/dev/null
mkdir -p "$tmp/app/.claude/skills"
for s in code-skeleton develop-feature integrate-api design-to-ui; do
  (cd "$root/.claude/skills" && tar -cf - --exclude=node_modules "$s") | (cd "$tmp/app/.claude/skills" && tar -xf -)
done

# expected skill ("none" = no skill should fire) | prompt
cases=(
  "none|Explain the difference between useMemo and useCallback in two sentences."
  "none|Write a Python script that reads a CSV file and prints the column names."
  "none|What does the build script in package.json do?"
  "none|Fix the typo 'recieve' if it appears in README.md."
  "code-skeleton|Set up a brand-new frontend project for our team's stack in a folder called admin-console."
  "develop-feature|Implement ticket PROFILE-3: a profile page at /profile showing the user's name and email from GET /me, with an edit form."
  "integrate-api|Our backend added GET /todos/stats returning { total, done }. Call it and expose a query for it."
  "integrate-api|DELETE /todos/:id now answers 404 when the todo is already gone. Handle that error and add a mock for it."
  "develop-feature|Implement ticket TODOS-9: users can delete a todo with DELETE /todos/:id; if it is already gone (404), show a toast."
  "design-to-ui|Make the settings page look like design/settings.png."
  "design-to-ui|Build this screen from the mockup in design/checkout.png."
  "design-to-ui|Implement this design for the profile page: https://www.figma.com/design/abc123/Profile?node-id=1-2"
  "develop-feature|Implement ticket SETTINGS-4: a settings page at /settings with a form saved via PUT /settings. Design: design/settings.png."
  "none|Make the app look nicer."
)

dir="$tmp/out"; mkdir -p "$dir"; i=0; pids=()
for c in "${cases[@]}"; do
  i=$((i + 1)); prompt="${c#*|}"
  (cd "$tmp/app" && "$claude_bin" -p "$prompt" --model "${EVAL_MODEL:-sonnet}" \
     --allowedTools "Read,Glob,Grep,Skill" --disallowedTools "Edit,Write,Bash" \
     --permission-prompts none --max-turns 3 --max-budget-usd 0.5 \
     --setting-sources project --no-session-persistence --output-format stream-json --verbose \
     > "$dir/$i.jsonl" 2>/dev/null) &
  pids+=($!)
done
for p in "${pids[@]}"; do wait "$p" || true; done

i=0; ok=0; total_cost=0
printf '%-16s %-16s %s\n' expected invoked prompt
for c in "${cases[@]}"; do
  i=$((i + 1)); expected="${c%%|*}"; prompt="${c#*|}"
  invoked="$(jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use" and .name=="Skill") | .input.skill' "$dir/$i.jsonl" 2>/dev/null | head -1)"
  invoked="${invoked:-none}"; invoked="${invoked##*:}"
  cost="$(grep '"type":"result"' "$dir/$i.jsonl" | tail -1 | jq -r '.total_cost_usd // 0')"
  total_cost="$(awk -v a="$total_cost" -v b="$cost" 'BEGIN{print a+b}')"
  mark="✗"; [ "$expected" = "$invoked" ] && { mark="✓"; ok=$((ok + 1)); }
  printf '%s %-14s %-16s %s\n' "$mark" "$expected" "$invoked" "${prompt:0:80}"
done
echo "trigger-check: $ok/${#cases[@]} as expected, cost \$$total_cost"

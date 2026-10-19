#!/usr/bin/env bash
# Grades a run directory produced by run-evals.sh. No model involved: gates, greps, file checks.
#
#   grade.sh <runs/timestamp-dir>
set -uo pipefail

runs="$(cd "${1:?usage: grade.sh <evals/runs/<timestamp>>}" && pwd)"
forbidden='@effect/platform|Context\.Tag|Effect\.Service|effectTsResolver|zodResolver|from .zod.|Schema\.decodeUnknown\(|react-router-dom|tailwind\.config|rest\.(get|post)|onUnhandledRequest|jest\.|isLoading|\bfetch\(|axios'
# design: colors must come from theme tokens, not hex/arbitrary values, color functions or Tailwind palette classes.
# A hex counts only in a color position, so href="#add", #main-content and &#039; do not match.
rawcolor='(^|[^[:alnum:]_&/="'\''{-]|[^={]["'\''])#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})([^[:alnum:]_-]|$)|(fill|stroke|[cC]olor)=[{]?["'\'']#[0-9a-fA-F]{3,8}|-\[(#|rgb|hsl|oklch)|\b(bg|text|border|ring|fill|stroke|from|to|via|outline|divide|placeholder|shadow)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-[0-9]|\b(bg|text|border|ring|fill|stroke|from|to|via|outline|divide|placeholder|shadow)-(white|black)\b|\b(rgba?|hsla?|oklch|oklab|color-mix)\('
primary() { grep -m1 -- '--primary:' "$1" 2>/dev/null | tr -d '[:space:]'; } # first one is :root (light)

check() { # <label> <command...>  → prints ✓/✗ and counts
  local label="$1"; shift
  if "$@" >/dev/null 2>&1; then pass=$((pass + 1)); printf '    ✓ %s\n' "$label"
  else fail=$((fail + 1)); printf '    ✗ %s\n' "$label"; fi
}
has() { grep -qE "$2" "$1" 2>/dev/null; }
# A skill counts as loaded when the Skill tool invoked it or its SKILL.md was read: a lead skill
# may open the other one with Read or with `cat` in Bash instead. Uses the loop's $skills and $dir.
loaded() { # <skill>
  grep -qE "(^|,|:)$1(,|$)" <<< "$skills" ||
    jq -e --arg f "$1/SKILL.md" 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use") | select((.input.file_path // .input.command // "") | contains($f))' "$dir/events.jsonl" >/dev/null 2>&1
}
count_tests() { grep -rhoE '^\s*(it|test)\(' "$@" 2>/dev/null | wc -l; }

printf '%-18s %-6s %-9s %-8s %-7s %-6s %s\n' run gates asserts forbid cost turns skills
summary=""
for dir in "$runs"/*/; do
  dir="${dir%/}"; name="$(basename "$dir")"; eval="${name%-*}"; app="$dir/app"
  pass=0; fail=0
  # A from-scratch run may create the project in a subfolder (e.g. app/demo-app).
  [ ! -f "$app/package.json" ] && [ -f "$app/demo-app/package.json" ] && app="$app/demo-app"
  echo "── $name"

  result="$(grep '"type":"result"' "$dir/events.jsonl" 2>/dev/null | tail -1)"
  cost="$(jq -r '.total_cost_usd // "?"' <<< "${result:-{\}}" 2>/dev/null)"
  turns="$(jq -r '.num_turns // "?"' <<< "${result:-{\}}" 2>/dev/null)"
  status="$(jq -r '.subtype // "no-result"' <<< "${result:-{\}}" 2>/dev/null)"
  skills="$(jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use" and .name=="Skill") | .input.skill' "$dir/events.jsonl" 2>/dev/null | sort -u | paste -sd, -)"
  echo "    session: $status, skills invoked: ${skills:-none}"

  if [ -f "$app/package.json" ] && (cd "$app" && pnpm install --frozen-lockfile --silent >/dev/null 2>&1; pnpm check > "$dir/gates.log" 2>&1); then gates=pass; else gates=FAIL; fi
  echo "    gates: $gates (log: $dir/gates.log)"

  hits="$(grep -rnE "$forbidden" "$app/src" --include='*.ts' --include='*.tsx' 2>/dev/null | grep -v 'src/components/ui/' | grep -vE '^\S+:\s*//' || true)"
  nhits=$(printf '%s' "$hits" | grep -c . || true)
  [ "$nhits" -gt 0 ] && printf '%s\n' "$hits" | head -5 | sed 's/^/    forbidden: /'

  case "$eval" in
    skeleton)
      check "package name is demo-app" has "$app/package.json" '"name": "demo-app"'
      check "CLAUDE.md names the app" has "$app/CLAUDE.md" 'demo-app'
      check "template copied (ApiClient)" test -f "$app/src/lib/api/client.ts"
      check "companions installed (shadcn skill)" test -f "$app/.claude/skills/shadcn/SKILL.md"
      check "skills-lock.json written" test -f "$app/skills-lock.json"
      ;;
    skeleton-baseline)
      check "package.json exists" test -f "$app/package.json"
      check "effect 4 installed" grep -qE '"effect": "[\^~]?4' "$app/package.json"
      check "msw installed" grep -q '"msw"' "$app/package.json"
      check "has at least one test" test "$(count_tests "$app/src")" -ge 1
      ;;
    feature|design)
      f="$app/src/features/notes"
      for x in schemas.ts api.ts queries.ts mocks.ts routes.tsx; do check "notes/$x exists" test -f "$f/$x"; done
      check "route registered" has "$app/src/app/routes.tsx" 'features/notes'
      check "handlers registered" has "$app/src/mocks/handlers.ts" 'features/notes'
      check "header links /notes" grep -rqE "to=.?\"?/notes" "$app/src/app"
      check "queries use runEffect" has "$f/queries.ts" 'runEffect\('
      check "form uses standardSchemaResolver" grep -rq 'standardSchemaResolver' "$f"
      check "title trimmed in schema" has "$f/schemas.ts" 'Trim'
      check "MSW imports from msw/http" grep -rq "from 'msw/http'" "$f"
      check ">= 7 notes tests" test "$(count_tests "$f")" -ge 7
      check "every notes component has a test" bash -c 'ls "$1"/components/*.tsx >/dev/null 2>&1 || exit 1; for c in "$1"/components/*.tsx; do case "$c" in *.test.tsx) ;; *) test -f "${c%.tsx}.test.tsx" || exit 1;; esac; done' _ "$f"
      if [ "$eval" = design ]; then
        check "no raw colors in UI" test -z "$(grep -rlE "$rawcolor" "$app/src" --include='*.ts' --include='*.tsx' --exclude='*.test.*' --exclude-dir=ui 2>/dev/null)"
        # Against the baseline commit, whether or not the session committed; new shadcn files are fine.
        base="$(git -C "$app" rev-list --max-parents=0 HEAD 2>/dev/null)"
        check "components/ui not modified" bash -c 'test -n "$2" && test -z "$(git -C "$1" diff "$2" --no-renames --diff-filter=MD --name-only -- src/components/ui)"' _ "$app" "$base"
        p0="$(primary <(git -C "$app" show "$base:src/styles/index.css" 2>/dev/null))"
        p="$(primary "$app/src/styles/index.css")"
        check "theme --primary changed" bash -c '[ -n "$1" ] && [ -n "$2" ] && [ "$1" != "$2" ]' _ "$p" "$p0"
        check "lucide-react used" grep -rqE "from ['\"]lucide-react['\"]" "$f"
        check "design-to-ui loaded" loaded design-to-ui
      fi
      ;;
    api)
      f="$app/src/features/todos"
      check "api.patch for toggle" has "$f/api.ts" 'api\.patch\('
      check "api.delete for delete" has "$f/api.ts" 'api\.delete\('
      check "mutations invalidate" test "$(grep -c 'invalidateQueries' "$f/queries.ts" 2>/dev/null || echo 0)" -ge 3
      check "PATCH + DELETE handlers" bash -c "grep -q 'http.patch' '$f/mocks.ts' && grep -q 'http.delete' '$f/mocks.ts'"
      check "404 handled via NotFoundError" grep -rq 'NotFoundError' "$f"
      check "404 tested" grep -rqiE 'no longer exists|404' "$f/components"
      # The fixture starts with 10 tests; toggle + delete + their 404s add at least 5.
      check ">= 15 todos tests" test "$(count_tests "$f")" -ge 15
      ;;
    feature-api)
      # A ticket whose endpoints go beyond list + create: develop-feature leads and loads integrate-api.
      f="$app/src/features/todos"
      check "develop-feature invoked" grep -qE '(^|,|:)develop-feature(,|$)' <<< "$skills"
      check "integrate-api loaded" loaded integrate-api
      check "api.patch for edit" has "$f/api.ts" 'api\.patch\('
      check "api.delete for delete" has "$f/api.ts" 'api\.delete\('
      check "PATCH + DELETE handlers" bash -c "grep -q 'http.patch' '$f/mocks.ts' && grep -q 'http.delete' '$f/mocks.ts'"
      check "mutations invalidate" test "$(grep -c 'invalidateQueries' "$f/queries.ts" 2>/dev/null || echo 0)" -ge 3
      check "404 handled via NotFoundError" grep -rq 'NotFoundError' "$f"
      check "404 toast tested" grep -rqi 'no longer exists' --include='*.test.tsx' "$f/components"
      check "sonner not mocked" bash -c '! grep -rqE "vi\.mock\(.sonner" "$1"' _ "$f"
      check "every todos component has a test" bash -c 'for c in "$1"/components/*.tsx; do case "$c" in *.test.tsx) ;; *) test -f "${c%.tsx}.test.tsx" || exit 1;; esac; done' _ "$f"
      # The fixture starts with 10 tests; edit (validation, success, 422, 404) and delete (success, 404) add 6.
      check ">= 16 todos tests" test "$(count_tests "$f")" -ge 16
      ;;
  esac
  [ "$gates" = pass ] && pass=$((pass + 1)) || fail=$((fail + 1))
  summary+="$(printf '%-18s %-6s %-9s %-8s %-7s %-6s %s' "$name" "$gates" "$pass/$((pass + fail))" "$nhits" "$cost" "$turns" "${skills:-none}")"$'\n'
done
echo
printf '%-18s %-6s %-9s %-8s %-7s %-6s %s\n' run gates asserts forbid cost turns skills
printf '%s' "$summary"

#!/usr/bin/env bash
# Installs the companion skills next to this project's skills, pinned to audited commits.
# Run from the project root. Needs network access and Node (npx).
#
# Each entry was read in full and audited for security and fit on 2026-10-18; the README of
# the skills repo lists what each one is for and where the project conventions override it.
# To upgrade one: read the diff between the old and new SHA, then change the SHA here.
set -euo pipefail

# The installer is pinned too: a pinned skill fetched by whatever `skills` npm serves today is
# only as safe as that release. To upgrade, read its changelog and check `add <url> -a -y` still
# behaves the same, then change the version here and in the README.
skills_cli="skills@1.7.2"

companions=(
  "shadcn-ui/ui/tree/d2fba50ee5b9113008b5bb908563527b7efd2f27/skills/shadcn"
  "remix-run/agent-skills/tree/33578aae4aa36a90c9f8f602105a1ccb0f4efe45/skills/react-router-data-mode"
  "antfu/skills/tree/feb0f3aba6566426f12230e7fc7a10d97c1293bb/skills/vite"
  "antfu/skills/tree/feb0f3aba6566426f12230e7fc7a10d97c1293bb/skills/vitest"
  "vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/react-best-practices"
  "vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/composition-patterns"
  "pproenca/dot-skills/tree/cf93c57cac89d6fc3e4194686000411567f5caf3/skills/.curated/react-hook-form"
  "affaan-m/ecc/tree/76aaa77df6adc5b889e689007bf99b9a4f74af34/skills/react-testing"
)

failed=()
for c in "${companions[@]}"; do
  echo "→ $c"
  if ! npx -y "$skills_cli" add "https://github.com/$c" -a claude-code -y; then
    failed+=("$c")
  fi
done

# The audited shadcn skill runs `npx shadcn@latest info --json` by itself when it loads, and
# pre-approves `shadcn@latest` commands: that is whatever npm serves that day. Point every one of
# them at the project's own shadcn, pinned by pnpm-lock.yaml. (skills-lock.json keeps the upstream
# hash, so `npx skills check` reports this skill as modified; re-run this script after an update.)
# Runs before the failure check below, so a partial install never leaves shadcn unpinned.
if [[ -d .claude/skills/shadcn ]]; then
  find .claude/skills/shadcn -name '*.md' -exec sed -i.bak -E 's/(npx|pnpm dlx|bunx --bun) shadcn@latest/pnpm exec shadcn/g' {} +
  find .claude/skills/shadcn -name '*.md.bak' -delete
  # A form the rewrite above does not know (a new flag, another runner) must not slip through.
  if grep -rn 'shadcn@latest' .claude/skills/shadcn; then
    echo "error: .claude/skills/shadcn still runs shadcn@latest (lines above); extend the rewrite" >&2
    exit 1
  fi
fi

if (( ${#failed[@]} > 0 )); then
  echo "companions not installed (${#failed[@]}):" >&2
  printf '  %s\n' "${failed[@]}" >&2
  exit 1
fi
if [[ ! -f skills-lock.json ]]; then
  echo "error: the skills CLI did not write skills-lock.json in $(pwd)" >&2
  exit 1
fi
echo "installed ${#companions[@]} companion skills into .claude/skills/ (lock: skills-lock.json)"

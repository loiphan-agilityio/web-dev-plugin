#!/usr/bin/env bash
# `pnpm lint`: ShellCheck on every script and `node --check` on the .mjs scripts. A script file
# rather than the command line in package.json, since pnpm runs that through cmd.exe on Windows,
# which cannot read the loop.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

shellcheck tools/*.sh web-dev/skills/*/scripts/*.sh web-dev/scripts/*.sh web-dev/evals/*.sh \
  web-dev/evals/fixtures/*.sh web-dev/evals/*/setup.sh web-quality/evals/*.sh \
  web-quality/evals/fixtures/*.sh web-quality/evals/*/setup.sh
for f in tools/*.mjs web-dev/scripts/*.mjs web-quality/scripts/*.mjs \
  web-dev/scripts/test/*.mjs web-quality/scripts/test/*.mjs; do
  node --check "$f"
done

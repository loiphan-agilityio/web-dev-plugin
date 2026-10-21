#!/usr/bin/env bash
# Validates every skill in web-dev/skills against the Agent Skills specification
# (https://agentskills.io/specification) with its reference validator, skills-ref:
# frontmatter is valid YAML, only the spec's fields, `name` matches the folder, lengths in range.
#
#   tools/validate-skills.sh
#
# Needs the `agentskills` command from `pip install skills-ref==0.1.1` (the CI job installs it);
# set AGENTSKILLS to its path when it is not on PATH.
set -euo pipefail

agentskills="${AGENTSKILLS:-agentskills}"
if ! command -v "$agentskills" >/dev/null; then
  echo "validate-skills: '$agentskills' not found; pip install skills-ref==0.1.1" >&2
  exit 2
fi

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
failed=0
for skill in "$here"/../web-dev/skills/*/; do
  "$agentskills" validate "$skill" || failed=1
done
exit "$failed"

#!/usr/bin/env bash
# Validates every skill of both plugins (web-dev/skills, web-quality/skills) against the Agent
# Skills specification (https://agentskills.io/specification) with its reference validator,
# skills-ref: frontmatter is valid YAML, only the spec's fields, `name` matches the folder,
# lengths in range.
# Then parses every <plugin>/evals/*/case.yaml: `claude plugin eval` skips a case whose YAML does
# not parse (a regex escape such as `\.` inside double quotes is enough), so it would never run.
#
#   tools/validate-skills.sh
#
# Needs the `agentskills` command from `pip install skills-ref==0.1.1` and PyYAML
# (`pip install pyyaml==6.0.3`; the CI job installs both). Set AGENTSKILLS to its path when it is
# not on PATH, and PYTHON to the interpreter that has PyYAML when it is not `python3`.
set -euo pipefail

agentskills="${AGENTSKILLS:-agentskills}"
if ! command -v "$agentskills" >/dev/null; then
  echo "validate-skills: '$agentskills' not found; pip install skills-ref==0.1.1" >&2
  exit 2
fi

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
failed=0
for skill in "$here"/../web-dev/skills/*/ "$here"/../web-quality/skills/*/; do
  "$agentskills" validate "$skill" || failed=1
done

cases=("$here"/../web-dev/evals/*/case.yaml "$here"/../web-quality/evals/*/case.yaml)
"${PYTHON:-python3}" - "${cases[@]}" <<'PY' || failed=1
import sys

import yaml

bad = 0
for path in sys.argv[1:]:
    try:
        with open(path, encoding="utf-8") as case:
            yaml.safe_load(case)
    except yaml.YAMLError as error:
        bad += 1
        print(f"Invalid eval case: {path}: {error}", file=sys.stderr)
print(f"Eval cases: {len(sys.argv) - 1 - bad} valid, {bad} invalid")
sys.exit(1 if bad else 0)
PY
exit "$failed"

#!/usr/bin/env bash
# Validates every skill of both plugins (web-dev/skills, web-quality/skills) against the Agent
# Skills specification (https://agentskills.io/specification) with its reference validator,
# skills-ref: frontmatter is valid YAML, only the spec's fields, `name` matches the folder,
# lengths in range.
# Then skill-validator (https://github.com/agent-ecosystem/skill-validator) runs `check --strict` on
# each plugin's skills: internal links resolve, every file under a skill is named by its text,
# token counts, content and contamination; a warning fails too. It calls no model and no network.
# Then parses every <plugin>/evals/*/case.yaml: `claude plugin eval` skips a case whose YAML does
# not parse (a regex escape such as `\.` inside double quotes is enough), so it would never run.
#
#   tools/validate-skills.sh
#
# Needs the `agentskills` command from `pip install skills-ref==0.1.1`, PyYAML
# (`pip install pyyaml==6.0.3`) and skill-validator 1.8.0 (`go install
# github.com/agent-ecosystem/skill-validator/cmd/skill-validator@v1.8.0`, or the release binary
# the CI job downloads and checks by SHA-256). Set AGENTSKILLS and SKILL_VALIDATOR to their paths
# when they are not on PATH, and PYTHON to the interpreter that has PyYAML when it is not
# `python3`. On GitHub Actions, skill-validator's findings also show as annotations on the diff.
set -euo pipefail

agentskills="${AGENTSKILLS:-agentskills}"
if ! command -v "$agentskills" >/dev/null; then
  echo "validate-skills: '$agentskills' not found; pip install skills-ref==0.1.1" >&2
  exit 2
fi
if ! skill_validator="$(command -v "${SKILL_VALIDATOR:-skill-validator}")"; then
  echo "validate-skills: '${SKILL_VALIDATOR:-skill-validator}' not found; install skill-validator" \
    "1.8.0 (see this script's header)" >&2
  exit 2
fi
# Absolute, since the check below runs from the repository root.
[[ "$skill_validator" == /* ]] || skill_validator="$PWD/$skill_validator"

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
failed=0
for skill in "$here"/../web-dev/skills/*/ "$here"/../web-quality/skills/*/; do
  "$agentskills" validate "$skill" || failed=1
done

annotate=()
if [[ "${GITHUB_ACTIONS:-}" == true ]]; then
  annotate=(--emit-annotations)
fi
# From the repository root, so an annotation names the file as the diff does (web-dev/skills/...).
for plugin in web-dev web-quality; do
  (cd "$here/.." && "$skill_validator" check --strict ${annotate[@]+"${annotate[@]}"} "$plugin/skills") ||
    failed=1
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

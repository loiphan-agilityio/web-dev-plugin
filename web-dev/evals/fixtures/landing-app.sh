#!/usr/bin/env bash
# Writes a `landing` fixture into the current directory: a landing page from the boilerplate (its
# UI kit, no API layer or Effect), not installed. The app is apps/web: cases name it in the prompt,
# since develop refuses the monorepo root. Clones the boilerplate (network; it is public).
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$here/../../skills/project-setup/scripts/create-project.sh" . --landing

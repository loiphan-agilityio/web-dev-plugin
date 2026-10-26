#!/usr/bin/env bash
# Writes a `template` fixture into the current directory: a web app from the boilerplate (with
# authentication, as every web app is), not installed. The app is apps/web: cases name it in the
# prompt, since develop refuses the monorepo root. Clones the boilerplate (network; it is public).
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$here/../../skills/project-setup/scripts/create-project.sh" . --auth

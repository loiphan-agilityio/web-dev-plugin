#!/usr/bin/env bash
# Builds the vue-app fixture in the case workspace.
set -euo pipefail
bash "$(dirname "${BASH_SOURCE[0]}")/../fixtures/vue-app.sh"

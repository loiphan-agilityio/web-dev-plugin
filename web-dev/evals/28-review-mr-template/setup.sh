#!/usr/bin/env bash
# Builds the template-app fixture in the case workspace.
set -euo pipefail
bash "$(dirname "${BASH_SOURCE[0]}")/../fixtures/template-app.sh"

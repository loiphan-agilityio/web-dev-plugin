#!/usr/bin/env bash
# Builds the other-stack-app fixture in the case workspace.
set -euo pipefail
bash "$(dirname "${BASH_SOURCE[0]}")/../fixtures/other-stack-app.sh"

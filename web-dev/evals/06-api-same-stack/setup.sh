#!/usr/bin/env bash
# Builds the same-stack-app fixture in the case workspace.
set -euo pipefail
bash "$(dirname "${BASH_SOURCE[0]}")/../fixtures/same-stack-app.sh"

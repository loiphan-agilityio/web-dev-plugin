#!/usr/bin/env bash
# Builds the broken-app fixture in the case workspace.
set -euo pipefail
bash "$(dirname "${BASH_SOURCE[0]}")/../fixtures/broken-app.sh"

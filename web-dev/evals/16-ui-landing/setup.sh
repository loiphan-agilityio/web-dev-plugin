#!/usr/bin/env bash
# Builds the landing-app fixture in the case workspace.
set -euo pipefail
bash "$(dirname "${BASH_SOURCE[0]}")/../fixtures/landing-app.sh"

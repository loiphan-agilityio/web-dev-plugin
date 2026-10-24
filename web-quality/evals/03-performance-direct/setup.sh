#!/usr/bin/env bash
# Builds the built-site fixture in the case workspace.
set -euo pipefail
bash "$(dirname "${BASH_SOURCE[0]}")/../fixtures/built-site.sh"

#!/usr/bin/env bash
# Builds the notes-folder fixture in the case workspace.
set -euo pipefail
bash "$(dirname "${BASH_SOURCE[0]}")/../fixtures/notes-folder.sh"

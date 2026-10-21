#!/usr/bin/env bash
# Writes a "new, state: other" fixture into the current directory: files, but no package.json,
# so an app built here goes into a subfolder and the files stay as they are.
set -euo pipefail
printf '# Team notes\n\nIdeas for an internal expense tracker.\n' > notes.md

#!/usr/bin/env bash
# Writes a `template` fixture into the current directory: the template, scaffolded as `invoices`,
# without installing it.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$here/../../skills/project-setup/scripts/scaffold.sh" . invoices

#!/usr/bin/env bash
# Copies the shared guideline sections from their source, the boilerplate's apps/web/CLAUDE.md,
# into web-dev/references/ (check-guidelines.mjs --write keeps each file's preamble). Run it after a
# guideline change is merged in the boilerplate, then review the diff and commit it.
#
#   tools/sync-references.sh   creates a project with create-project.sh --no-auth (clones the
#                              boilerplate: network; BOILERPLATE_REPO points it at another clone
#                              URL), the same CLAUDE.md that verify.sh compares
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
plugin_root="$(cd "$here/../web-dev" && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

bash "$plugin_root/skills/project-setup/scripts/create-project.sh" "$tmp/app" --no-auth >/dev/null
node "$here/check-guidelines.mjs" --write "$plugin_root/references" "$tmp/app/apps/web/CLAUDE.md"

#!/usr/bin/env bash
# Copies the shared guideline sections from their source, the boilerplate's apps/web/CLAUDE.md,
# into web-dev/references/ (check-guidelines.mjs --write keeps each file's preamble). Run it after a
# guideline change is merged in the boilerplate, then review the diff and commit it.
#
#   tools/sync-references.sh   clones the boilerplate's main branch (network); BOILERPLATE_REPO
#                              points it at another clone URL or a local clone, as for
#                              create-project.sh
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="${BOILERPLATE_REPO:-https://github.com/loiphan-agilityio/react-vite-boilerplate.git}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

git clone --quiet --depth 1 "$repo" "$tmp/boilerplate"
node "$here/check-guidelines.mjs" --write "$here/../web-dev/references" \
  "$tmp/boilerplate/apps/web/CLAUDE.md"

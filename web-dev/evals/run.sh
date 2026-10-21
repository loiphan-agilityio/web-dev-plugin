#!/usr/bin/env bash
# Runs the eval suite against a clean copy of the plugin. `claude plugin eval` on web-dev/ itself
# fails with E2BIG once the template's node_modules is installed (the root `pnpm install` puts
# ~37k files there), so this copies the plugin without local output and runs the copy.
#
#   evals/run.sh [claude plugin eval options...]
#
# Defaults: --scaffold (the cases' setup.sh only writes fixture files), the tools the skills need,
# and a with/without-plugin baseline. Anything passed is added after them, e.g.
#   evals/run.sh --tag routing --runs 1 --no-publish
# Results land in evals/results/<timestamp>/ of this checkout (ignored by git).
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
plugin_root="$(cd "$here/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

(cd "$plugin_root" && tar -cf - --exclude=node_modules --exclude=dist --exclude=coverage \
  --exclude=storybook-static --exclude=evals/results .) | (mkdir -p "$tmp/web-dev" && cd "$tmp/web-dev" && tar -xf -)

out="$here/results/$(date -u +%Y-%m-%dT%H-%M-%SZ)"
mkdir -p "$out"
claude plugin eval "$tmp/web-dev" --scaffold --allow-tools Bash Write Edit \
  --ablation with-without --output-dir "$out" --report "$out/report.html" "$@"

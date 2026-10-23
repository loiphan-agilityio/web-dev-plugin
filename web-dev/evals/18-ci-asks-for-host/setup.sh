#!/usr/bin/env bash
# Builds the template-app fixture in the case workspace, as a git repository whose origin is on
# GitHub: ci-setup must still ask for the host instead of reading it from the remote.
set -euo pipefail
bash "$(dirname "${BASH_SOURCE[0]}")/../fixtures/template-app.sh"
git init -q .
git remote add origin git@github.com:acme/invoices.git

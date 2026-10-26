#!/usr/bin/env bash
# The web-dev model evals: tools/run-evals.sh with this plugin's name. Paid model time: its header
# says when a run is allowed and what it refuses before spending anything.
#
#   evals/run.sh [claude plugin eval options...]
set -euo pipefail

exec bash "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/tools/run-evals.sh" web-dev "$@"

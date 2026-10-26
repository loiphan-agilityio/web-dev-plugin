# Evals

Routing cases for web-quality: does a quality request reach `audit` or the right domain skill and
measure with the plugin's scripts, and do unrelated requests leave the plugin alone. Cases 01–03
run on `fixtures/built-site.sh`, a built app whose initial JavaScript (about 340 kB gzip) is over
the 300 kB budget.

| Case | Folder | Checks |
|---|---|---|
| `01-audit-command` | built app | `/web-quality:audit` runs `bundle-budget.mjs`; the report gives the JS overrun as measured and lists what it could not check |
| `02-audit-natural` | built app | a plain-words "ready for production?" reaches `audit` |
| `03-performance-direct` | built app | a bundle question reaches `performance` (or `audit`) and runs `bundle-budget.mjs` |
| `04-security-headers` | empty (network) | a header question about a URL reaches `security` (or `audit`) and runs `check-headers.mjs` |
| `05-no-trigger-feature` | empty | a feature request fires no web-quality skill |
| `06-no-trigger-unrelated` | empty | a shell question fires no skill |

Every run is paid model time: run them only when the maintainer asks for an eval run, as the
repository's `CLAUDE.md` says, on this machine (never in CI), with `bash evals/run.sh --tag routing`
from `web-quality/`. Through `tools/run-evals.sh`, it refuses single cases, uncommitted work, a HEAD
that is not the release commit (`web-quality--v<version>`) and plugin content already evaluated,
runs the free checks first (`pnpm lint`, `validate-skills.sh`, the scripts' tests), caps the cost
and runs one arm unless `--ablation with-without` asks for the no-plugin baseline.

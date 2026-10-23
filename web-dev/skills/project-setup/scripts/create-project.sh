#!/usr/bin/env bash
# Creates a project from the react-vite-boilerplate (a pnpm + Turborepo monorepo, the app in
# apps/web) with the boilerplate's own generator, create/index.js, with or without its
# authentication overlay.
#
#   create-project.sh <target-dir> --auth | --no-auth
#
# There is no default: the generator asks only on a terminal, and Claude's shell is not one, so the
# skill asks the user and passes the answer. Clones the boilerplate's default branch
# (BOILERPLATE_REPO overrides the URL: a fork, a mirror, a local repository), generates into a
# temporary folder, then copies the result into <target-dir>. Refuses to overwrite: if any project
# file already exists in the target, or a file sits where the project has a directory, it lists the
# conflicts and exits 1 without copying anything. Existing .git/ and .claude/ are left alone: the
# project's .claude/settings.json (the commands the skills run, allowed without a prompt, and the
# hook that formats each file Claude writes) is copied only when the target has none.
set -euo pipefail

repo="${BOILERPLATE_REPO:-https://github.com/loiphan-agilityio/react-vite-boilerplate.git}"
usage="usage: create-project.sh <target-dir> --auth|--no-auth"
target="${1:?$usage}"
auth="${2:-}"
if [[ "$auth" != --auth && "$auth" != --no-auth ]]; then
  echo "error: pass --auth or --no-auth (ask the user which); $usage" >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
git clone --quiet --depth 1 "$repo" "$tmp/src"
if [[ ! -f "$tmp/src/create/index.js" ]]; then
  echo "error: $repo has no create/index.js on its default branch" >&2
  exit 1
fi
# The generator prints next steps with the temporary path; the skill gives its own.
node "$tmp/src/create/index.js" "$tmp/out" --from "$tmp/src" "$auth" >/dev/null

mkdir -p "$target"
target="$(cd "$target" && pwd)"
kept=""
if [[ -e "$target/.claude/settings.json" ]]; then
  rm -f "$tmp/out/.claude/settings.json"
  kept="; kept the existing .claude/settings.json (the boilerplate's allow-list and format hook were not copied)"
fi
files="$(cd "$tmp/out" && find . -type f | sed 's#^\./##' | sort)"
dirs="$(cd "$tmp/out" && find . -mindepth 1 -type d | sed 's#^\./##' | sort)"
conflicts=""
while IFS= read -r f; do
  if [[ -e "$target/$f" ]]; then
    conflicts+="  $f"$'\n'
  fi
done <<< "$files"
# A file where the project has a directory (a file named `apps`) would make tar fail halfway.
while IFS= read -r d; do
  if [[ -e "$target/$d" && ! -d "$target/$d" ]]; then
    conflicts+="  $d (a file where the project has a directory)"$'\n'
  fi
done <<< "$dirs"
if [[ -n "$conflicts" ]]; then
  echo "error: these files already exist in $target; nothing was copied:" >&2
  printf '%s' "$conflicts" >&2
  exit 1
fi

(cd "$tmp/out" && tar -cf - .) | (cd "$target" && tar -xf -)
echo "created the project in $target ($(wc -l <<< "$files" | tr -d ' ') files, $([[ "$auth" == --auth ]] && echo with || echo without) authentication); the app is apps/web$kept"

#!/usr/bin/env bash
# Creates a project from the react-vite-boilerplate (a pnpm + Turborepo monorepo, the app in
# apps/web) with the boilerplate's own generator, create/index.js: a web app with or without its
# authentication overlay, or a landing page (its landing overlay: one public marketing page, no
# sign-in, built without mocks).
#
#   create-project.sh <target-dir> --auth | --no-auth | --landing
#
# There is no default: the generator asks only on a terminal, and Claude's shell is not one, so the
# skill asks the user and passes the answer. Fetches the boilerplate at the commit pinned below,
# generates into a temporary folder, then copies the result into <target-dir>. Refuses to overwrite: if any project
# file already exists in the target, or a file sits where the project has a directory, it lists the
# conflicts and exits 1 without copying anything. Existing .git/ and .claude/ are left alone: the
# project's .claude/settings.json (the commands the skills run, allowed without a prompt, and the
# hook that formats each file Claude writes) is copied only when the target has none.
#
# BOILERPLATE_REPO fetches from another URL (a fork, a mirror, a local repository), its default
# branch unless BOILERPLATE_REF names another commit, branch or tag (`main` tries the latest).
set -euo pipefail

# The boilerplate commit this plugin release was verified against (tools/verify.sh runs every gate
# on it): the code every skill quotes. A plugin version therefore always creates the same project,
# whatever the boilerplate's main has become. Moved by a maintainer: see CLAUDE.md.
pinned=4c7b41a197d34d11dfef100e392ec453d73dbb62
repo="${BOILERPLATE_REPO:-https://github.com/loiphan-agilityio/react-vite-boilerplate.git}"
if [[ -n "${BOILERPLATE_REF:-}" ]]; then
  ref="$BOILERPLATE_REF"
elif [[ -n "${BOILERPLATE_REPO:-}" ]]; then
  ref=HEAD
else
  ref="$pinned"
fi
usage="usage: create-project.sh <target-dir> --auth|--no-auth|--landing"
target="${1:?$usage}"
kind="${2:-}"
if [[ "$kind" != --auth && "$kind" != --no-auth && "$kind" != --landing ]]; then
  echo "error: pass --auth, --no-auth or --landing (ask the user which); $usage" >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
# fetch, not clone: a clone takes only a branch or a tag, and the pin is a commit.
git init --quiet "$tmp/src"
git -C "$tmp/src" fetch --quiet --depth 1 "$repo" "$ref"
git -C "$tmp/src" -c advice.detachedHead=false checkout --quiet FETCH_HEAD
if [[ ! -f "$tmp/src/create/index.js" ]]; then
  echo "error: $repo has no create/index.js at $ref" >&2
  exit 1
fi
# The generator names the project after its output folder, a temporary one here: pass the target's
# name instead (`.` counts as the folder it names). It asks "landing page or web app?" and, for a
# web app, about authentication: answer both.
name="$(node -p 'require("node:path").basename(require("node:path").resolve(process.argv[1]))' "$target")"
if [[ "$kind" == --landing ]]; then choice=(--landing); else choice=(--app "$kind"); fi
# The generator prints next steps with the temporary path; the skill gives its own.
node "$tmp/src/create/index.js" "$tmp/out" --from "$tmp/src" "${choice[@]}" --name "$name" >/dev/null

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
case "$kind" in
  --auth) what="a web app with authentication" ;;
  --no-auth) what="a web app without authentication" ;;
  *) what="a landing page" ;;
esac
echo "created the project in $target ($(wc -l <<< "$files" | tr -d ' ') files, $what); the app is apps/web$kept"

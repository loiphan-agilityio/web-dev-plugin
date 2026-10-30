#!/usr/bin/env bash
# Creates a project from the react-vite-boilerplate (a pnpm + Turborepo monorepo, the app in
# apps/web) with the boilerplate's own generator, create/index.js: a web app with its
# authentication overlay, or a landing page (its landing overlay: one public marketing page, no
# sign-in, built without mocks). A web app always has authentication.
#
#   create-project.sh <target-dir> --auth | --landing [--replace] [--name <name>]
#
# There is no default: the generator asks only on a terminal, and Claude's shell is not one, so the
# skill asks the user and passes the answer. Fetches the boilerplate at the commit pinned below,
# generates into a temporary folder, then copies the result into <target-dir>. Refuses to overwrite: if any project
# file already exists in the target, or a file sits where the project has a directory, it lists the
# conflicts and exits 1 without copying anything. Existing .git/ and .claude/ are left alone: the
# project's .claude/settings.json (the commands the skills run, allowed without a prompt, and the
# hook that formats each file Claude writes) is copied only when the target has none.
# --replace (the skill passes it once the user agreed) replaces the files git tracks in the target,
# outside .claude/: they are deleted, then the project is copied in. It needs a clean working tree,
# so only committed files go, and untracked files still count as conflicts.
# --name names the project (the root package, the page <title>, the web manifest) instead of the
# target folder. The name `web` is refused: it is apps/web's package, and the workspace needs
# unique names.
#
# BOILERPLATE_REPO fetches from another URL (a fork, a mirror, a local repository), its default
# branch unless BOILERPLATE_REF names another commit, branch or tag (`main` tries the latest).
set -euo pipefail

# The boilerplate commit this plugin release was verified against (tools/verify.sh runs every gate
# on it): the code every skill quotes. A plugin version therefore always creates the same project,
# whatever the boilerplate's main has become. Moved by a maintainer: see CLAUDE.md.
pinned=ace5470180981ce27d04b085c79a58f12d238db5
repo="${BOILERPLATE_REPO:-https://github.com/loiphan-agilityio/react-vite-boilerplate.git}"
if [[ -n "${BOILERPLATE_REF:-}" ]]; then
  ref="$BOILERPLATE_REF"
elif [[ -n "${BOILERPLATE_REPO:-}" ]]; then
  ref=HEAD
else
  ref="$pinned"
fi
usage="usage: create-project.sh <target-dir> --auth|--landing [--replace] [--name <name>]"
target="${1:?$usage}"
kind="${2:-}"
if [[ "$kind" != --auth && "$kind" != --landing ]]; then
  echo "error: pass --auth or --landing (ask the user which); $usage" >&2
  exit 1
fi
shift 2
replace=""
name=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --replace) replace=--replace ;;
    --name)
      name="${2:-}"
      if [[ -z "$name" ]]; then
        echo "error: --name needs a value; $usage" >&2
        exit 1
      fi
      shift
      ;;
    *)
      echo "error: unknown option $1; $usage" >&2
      exit 1
      ;;
  esac
  shift
done
tracked=""
if [[ -n "$replace" ]]; then
  if ! git -C "$target" rev-parse --verify --quiet HEAD >/dev/null 2>&1; then
    echo "error: --replace needs a git repository with a commit in $target" >&2
    exit 1
  fi
  if [[ -n "$(git -C "$target" status --porcelain --untracked-files=no)" ]]; then
    echo "error: --replace needs a clean working tree in $target; commit or stash first" >&2
    exit 1
  fi
  tracked="$(git -C "$target" ls-files -- . ':(exclude).claude')"
fi

# The generator names the project after its output folder, a temporary one here: pass --name or the
# target's name instead (`.` counts as the folder it names). It asks "landing page or web app?" and,
# for a web app, about authentication: answer both (a web app always gets it).
if [[ -z "$name" ]]; then
  name="$(node -p 'require("node:path").basename(require("node:path").resolve(process.argv[1]))' "$target")"
fi
if [[ "$(tr '[:upper:]' '[:lower:]' <<< "$name")" == web ]]; then
  echo "error: the project cannot be named web, the name of its app package (apps/web); pass --name <product name>" >&2
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
# is_replaced <path>: a tracked file that --replace deletes is no conflict.
is_replaced() { [[ -n "$tracked" ]] && grep -qxF -- "$1" <<< "$tracked"; }
while IFS= read -r f; do
  if [[ -e "$target/$f" ]] && ! is_replaced "$f"; then
    conflicts+="  $f"$'\n'
  fi
done <<< "$files"
# A file where the project has a directory (a file named `apps`) would make tar fail halfway.
while IFS= read -r d; do
  if [[ -e "$target/$d" && ! -d "$target/$d" ]] && ! is_replaced "$d"; then
    conflicts+="  $d (a file where the project has a directory)"$'\n'
  fi
done <<< "$dirs"
if [[ -n "$conflicts" ]]; then
  echo "error: these files already exist in $target; nothing was copied:" >&2
  printf '%s' "$conflicts" >&2
  exit 1
fi

if [[ -n "$tracked" ]]; then
  (cd "$target" && git ls-files -z -- . ':(exclude).claude' | xargs -0 rm -f)
  kept+="; replaced the $(wc -l <<< "$tracked" | tr -d ' ') files git tracked"
fi
(cd "$tmp/out" && tar -cf - .) | (cd "$target" && tar -xf -)
if [[ "$kind" == --auth ]]; then what="a web app with authentication"; else what="a landing page"; fi
echo "created the project in $target ($(wc -l <<< "$files" | tr -d ' ') files, $what); the app is apps/web$kept"

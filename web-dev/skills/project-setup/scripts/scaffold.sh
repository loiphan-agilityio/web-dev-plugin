#!/usr/bin/env bash
# Copies the verified template into <target-dir> and names the app.
#
#   scaffold.sh <target-dir> [app-name]
#
# app-name defaults to the target directory's name and must be a valid npm package name.
# Refuses to overwrite: if any template file already exists in the target, or a file sits where the
# template has a directory, it lists the conflicts and exits 1 without copying anything. Existing
# .git/ and .claude/ are left alone: the template's .claude/settings.json (the commands the skills
# run, allowed without a prompt, and the hook that formats each file Claude writes) is copied only
# when the target has none.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
template="$here/../assets/app-template"
target="${1:?usage: scaffold.sh <target-dir> [app-name]}"
mkdir -p "$target"
target="$(cd "$target" && pwd)"
name="${2:-$(basename "$target")}"

if [[ ! "$name" =~ ^[a-z0-9][a-z0-9._-]*$ ]]; then
  echo "error: app name '$name' must be lowercase letters, digits, '.', '_' or '-'" >&2
  exit 1
fi

# Local output of the template itself (what its .gitignore lists); never part of a new project.
# public/mockServiceWorker.js is written by `msw init` on install; .env.local may hold a
# maintainer's own settings.
skip=(node_modules dist coverage storybook-static .vitest public/mockServiceWorker.js)
skip_names=('*storybook.log' '*.tsbuildinfo' '.env.local' '.env.*.local')
# Copied on its own below, so an existing one is neither a conflict nor overwritten.
settings=.claude/settings.json
skip+=("$settings")
prune=()
excludes=()
for d in "${skip[@]}"; do
  prune+=(-path "./$d" -prune -o)
  excludes+=("--exclude=./$d")
done
for n in "${skip_names[@]}"; do
  prune+=(-name "$n" -prune -o)
  excludes+=("--exclude=$n")
done
files="$(cd "$template" && find . "${prune[@]}" -type f -print | sed 's#^\./##' | sort)"
dirs="$(cd "$template" && find . "${prune[@]}" -mindepth 1 -type d -print | sed 's#^\./##' | sort)"

conflicts=""
while IFS= read -r f; do
  if [[ -e "$target/$f" ]]; then
    conflicts+="  $f"$'\n'
  fi
done <<< "$files"
# A file where the template has a directory (a file named `src`) would be replaced by tar.
while IFS= read -r d; do
  if [[ -n "$d" && -e "$target/$d" && ! -d "$target/$d" ]]; then
    conflicts+="  $d (a file where the template has a directory)"$'\n'
  fi
done <<< "$dirs"
if [[ -n "$conflicts" ]]; then
  echo "error: these files already exist in $target; nothing was copied:" >&2
  printf '%s' "$conflicts" >&2
  exit 1
fi

(cd "$template" && tar -cf - "${excludes[@]}" .) | (cd "$target" && tar -xf -)

if [[ -e "$target/$settings" ]]; then
  echo "kept the existing $settings; the template's command allow-list and format hook were not copied"
else
  mkdir -p "$target/.claude"
  cp "$template/$settings" "$target/$settings"
fi

named=(package.json index.html CLAUDE.md src/app/root-layout.tsx src/app/home-page.tsx
  src/app/__tests__/home-page.test.tsx)
for f in "${named[@]}"; do
  # -i.bak, then delete it: the one in-place form that GNU and BSD sed both accept.
  sed -i.bak "s/app-template/$name/g" "$target/$f"
  rm -f "$target/$f.bak"
done

echo "scaffolded '$name' into $target ($(wc -l <<< "$files" | tr -d ' ') files)"

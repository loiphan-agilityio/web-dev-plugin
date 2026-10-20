#!/usr/bin/env bash
# Copies the verified template into <target-dir> and names the app.
#
#   scaffold.sh <target-dir> [app-name]
#
# app-name defaults to the target directory's name and must be a valid npm package name.
# Refuses to overwrite: if any template file already exists in the target, or a file sits where the
# template has a directory, it lists the conflicts and exits 1 without copying anything. Existing
# .git/ and .claude/ are left alone.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
template="$here/../template"
target="${1:?usage: scaffold.sh <target-dir> [app-name]}"
mkdir -p "$target"
target="$(cd "$target" && pwd)"
name="${2:-$(basename "$target")}"

if [[ ! "$name" =~ ^[a-z0-9][a-z0-9._-]*$ ]]; then
  echo "error: app name '$name' must be lowercase letters, digits, '.', '_' or '-'" >&2
  exit 1
fi

# Local build output of the template itself; never part of a new project.
skip=(node_modules dist coverage storybook-static)
prune=(); for d in "${skip[@]}"; do prune+=(-path "./$d" -prune -o); done
files="$(cd "$template" && find . "${prune[@]}" -name '*storybook.log' -prune -o -type f -print | sed 's#^\./##' | sort)"
dirs="$(cd "$template" && find . "${prune[@]}" -mindepth 1 -type d -print | sed 's#^\./##' | sort)"

conflicts=""
while IFS= read -r f; do
  [ -e "$target/$f" ] && conflicts+="  $f"$'\n'
done <<< "$files"
# A file where the template has a directory (a file named `src`) would be replaced by tar.
while IFS= read -r d; do
  [ -n "$d" ] && [ -e "$target/$d" ] && [ ! -d "$target/$d" ] && conflicts+="  $d (a file where the template has a directory)"$'\n'
done <<< "$dirs"
if [ -n "$conflicts" ]; then
  echo "error: these files already exist in $target; nothing was copied:" >&2
  printf '%s' "$conflicts" >&2
  exit 1
fi

excludes=(--exclude='*storybook.log'); for d in "${skip[@]}"; do excludes+=("--exclude=./$d"); done
(cd "$template" && tar -cf - "${excludes[@]}" .) | (cd "$target" && tar -xf -)

for f in package.json index.html CLAUDE.md src/app/root-layout.tsx src/app/home-page.tsx src/app/__tests__/home-page.test.tsx; do
  sed -i.bak "s/app-template/$name/g" "$target/$f" && rm -f "$target/$f.bak"
done

echo "scaffolded '$name' into $target ($(wc -l <<< "$files" | tr -d ' ') files)"

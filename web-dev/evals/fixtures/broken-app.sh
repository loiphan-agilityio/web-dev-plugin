#!/usr/bin/env bash
# Writes a broken fixture into the current directory: a React app whose package.json is not valid
# JSON (a merge left a trailing comma). detect-project.mjs must fail on it, not call it new.
set -euo pipefail
mkdir -p src
cat > package.json <<'JSON'
{
  "name": "settings-app",
  "private": true,
  "dependencies": { "react": "^19.3.1", "react-dom": "^19.3.1", },
}
JSON
printf 'export const App = () => <h1>Settings</h1>;\n' > src/App.tsx

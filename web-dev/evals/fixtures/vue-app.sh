#!/usr/bin/env bash
# Writes an unsupported fixture into the current directory: a Vue app. Nothing is installed.
set -euo pipefail
mkdir -p src
cat > package.json <<'JSON'
{
  "name": "vue-shop",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "vite build" },
  "dependencies": { "vue": "^3.5.12" },
  "devDependencies": { "vite": "^5.4.10", "@vitejs/plugin-vue": "^5.1.4" }
}
JSON
printf '<template><h1>Shop</h1></template>\n' > src/App.vue

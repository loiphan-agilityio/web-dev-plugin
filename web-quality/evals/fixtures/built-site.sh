#!/usr/bin/env bash
# A built single-page app in the case workspace: package.json and a Vite-style dist/ with an
# entry script over the 300 kB JS budget, a stylesheet and one lazy chunk, so the measurements
# have something to find.
set -euo pipefail
mkdir -p dist/assets
cat > package.json <<'JSON'
{ "name": "shop", "private": true, "scripts": { "build": "vite build", "preview": "vite preview" } }
JSON
cat > dist/index.html <<'HTML'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Shop</title>
    <script type="module" crossorigin src="/assets/index-AbCd1234.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-EfGh5678.css">
  </head>
  <body><div id="root"></div></body>
</html>
HTML
# Incompressible bytes, so gzip keeps the size: about 340 kB of JavaScript.
head -c 350000 /dev/urandom > dist/assets/index-AbCd1234.js
printf 'body{margin:0}' > dist/assets/index-EfGh5678.css
head -c 40000 /dev/urandom > dist/assets/checkout-IjKl9012.js

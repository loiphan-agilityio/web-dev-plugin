#!/usr/bin/env node
// Writes the worked todos feature that the skills quote into an app, so verify-template.sh can run
// every gate on it. The markdown is the only source: each quoted file is a fenced block whose info
// string names it (```tsx file=src/features/todos/components/todo-list.tsx). Blocks naming the
// same file are joined in order (schemas.ts is quoted in two parts).
//
//   node extract-snippets.mjs <skills-dir> <app-dir>
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const [skillsDir, appDir] = process.argv.slice(2);
if (!skillsDir || !appDir) {
  console.error('usage: extract-snippets.mjs <skills-dir> <app-dir>');
  process.exit(2);
}

/** @type {(dir: string) => string[]} */
const markdownFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'assets' ? [] : markdownFiles(path);
    return entry.name.endsWith('.md') ? [path] : [];
  });

const fence = /^```\w+ file=(\S+)\s*$/;
/** @type {Map<string, string[]>} */
const files = new Map();
for (const doc of markdownFiles(skillsDir)) {
  const lines = readFileSync(doc, 'utf8').split(/\r?\n/);
  lines.forEach((line, start) => {
    const [, path] = fence.exec(line) ?? [];
    if (!path) return;
    const end = lines.findIndex((l, i) => i > start && /^```\s*$/.test(l));
    if (end < 0) throw new Error(`${relative(skillsDir, doc)}:${start + 1}: unclosed block`);
    files.set(path, [...(files.get(path) ?? []), lines.slice(start + 1, end).join('\n')]);
  });
}

if (files.size === 0) {
  console.error(`extract-snippets: no \`file=\` blocks under ${skillsDir}`);
  process.exit(1);
}
for (const [path, parts] of files) {
  const target = join(appDir, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${parts.join('\n\n')}\n`);
}
console.log(`extract-snippets: wrote ${files.size} files: ${[...files.keys()].join(', ')}`);

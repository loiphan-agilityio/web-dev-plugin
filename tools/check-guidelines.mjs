#!/usr/bin/env node
// Fails when a shared guideline in the plugin's references/ and the same section of the app's
// CLAUDE.md differ. Each mirrored file below has a preamble for the skills, then one `## ` section
// that the boilerplate's apps/web/CLAUDE.md carries word for word, so a project from it keeps it
// without the plugin. Other files in references/ (companions.md) are for the skills only.
//
//   node check-guidelines.mjs <references-dir> <app-claude-md>
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [referencesDir, claudeMd] = process.argv.slice(2);
if (!referencesDir || !claudeMd) {
  console.error('usage: check-guidelines.mjs <references-dir> <app-claude-md>');
  process.exit(2);
}

/** @type {(lines: string[]) => string} */
const text = (lines) => lines.join('\n').trimEnd();

/** @type {(lines: string[], heading: string) => string | undefined} */
const sectionOf = (lines, heading) => {
  const start = lines.indexOf(heading);
  if (start < 0) return undefined;
  const next = lines.findIndex((line, i) => i > start && line.startsWith('## '));
  return text(lines.slice(start, next < 0 ? undefined : next));
};

const mirrored = ['stack-guidelines.md', 'coding-standards.md', 'architecture.md'];
const template = readFileSync(claudeMd, 'utf8').split(/\r?\n/);
const problems = mirrored.flatMap((name) => {
  if (!existsSync(join(referencesDir, name))) return [`${name}: missing from ${referencesDir}`];
  const lines = readFileSync(join(referencesDir, name), 'utf8').split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith('## '));
  if (start < 0) return [`${name}: no \`## \` section`];
  const heading = lines[start];
  const shared = text(lines.slice(start));
  const copy = sectionOf(template, heading);
  if (copy === undefined) return [`${name}: CLAUDE.md has no "${heading}"`];
  return copy === shared ? [] : [`${name}: "${heading}" differs from CLAUDE.md`];
});

if (problems.length > 0) {
  console.error(`check-guidelines: ${problems.length} shared section(s) out of sync`);
  problems.forEach((problem) => {
    console.error(`  ${problem}`);
  });
  process.exit(1);
}
console.log(`check-guidelines: references/ and ${claudeMd} agree`);

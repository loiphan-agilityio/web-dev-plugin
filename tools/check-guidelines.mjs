#!/usr/bin/env node
// Fails when a shared guideline in the plugin's references/ and the same section of the app's
// CLAUDE.md differ, or when references/rules/ and the project's .claude/rules/ differ (whole rule
// files, byte for byte after CRLF and trailing whitespace are normalised; a file missing on either
// side counts). Each mirrored file below has a preamble for the skills, then one `## ` section
// that the boilerplate's apps/web/CLAUDE.md carries word for word, so a project from it keeps it
// without the plugin. Other files in references/ (companions.md) are for the skills only.
// The boilerplate is the source: --write copies its sections over the ones in references/ and
// keeps each preamble, and copies the project's rule files into references/rules/, deleting the ones
// the project no longer has (tools/sync-references.sh runs it on a project created from the
// boilerplate). The project root is two folders above the app CLAUDE.md (<root>/apps/web/CLAUDE.md).
//
//   node check-guidelines.mjs [--write] <references-dir> <app-claude-md>
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const write = args[0] === '--write';
const [referencesDir, claudeMd] = write ? args.slice(1) : args;
if (!referencesDir || !claudeMd) {
  console.error('usage: check-guidelines.mjs [--write] <references-dir> <app-claude-md>');
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

const mirrored = ['stack-guidelines.md'];
const template = readFileSync(claudeMd, 'utf8').split(/\r?\n/);
const problems = mirrored.flatMap((name) => {
  const path = join(referencesDir, name);
  if (!existsSync(path)) return [`${name}: missing from ${referencesDir}`];
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith('## '));
  if (start < 0) return [`${name}: no \`## \` section`];
  const heading = lines[start];
  const shared = text(lines.slice(start));
  const copy = sectionOf(template, heading);
  if (copy === undefined) return [`${name}: CLAUDE.md has no "${heading}"`];
  if (copy === shared) return [];
  if (!write) return [`${name}: "${heading}" differs from CLAUDE.md`];
  writeFileSync(path, `${text([...lines.slice(0, start), copy])}\n`);
  console.log(`check-guidelines: ${name}: copied "${heading}" from ${claudeMd}`);
  return [];
});

const root = resolve(dirname(claudeMd), '..', '..');
const projectRules = join(root, '.claude', 'rules');
const mirroredRules = join(referencesDir, 'rules');

/** @type {(dir: string) => string[]} */
const ruleFiles = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((name) => name.endsWith('.md'))
        .sort()
    : [];

/** @type {(path: string) => string} */
const normalised = (path) => text(readFileSync(path, 'utf8').split(/\r?\n/));

if (!existsSync(projectRules)) {
  problems.push(`rules: the project has no .claude/rules/ (${projectRules})`);
} else {
  const source = ruleFiles(projectRules);
  const copies = ruleFiles(mirroredRules);
  source.forEach((name) => {
    const target = join(mirroredRules, name);
    const present = existsSync(target);
    if (present && normalised(target) === normalised(join(projectRules, name))) return;
    if (!write) {
      problems.push(
        present
          ? `rules/${name}: differs from .claude/rules/${name}`
          : `rules/${name}: missing from ${mirroredRules}`,
      );
      return;
    }
    mkdirSync(mirroredRules, { recursive: true });
    writeFileSync(target, `${normalised(join(projectRules, name))}\n`);
    console.log(
      `check-guidelines: rules/${name}: ${present ? 'updated from' : 'copied from'} ${projectRules}`,
    );
  });
  copies
    .filter((name) => !source.includes(name))
    .forEach((name) => {
      if (!write) {
        problems.push(`rules/${name}: the project has no .claude/rules/${name}`);
        return;
      }
      rmSync(join(mirroredRules, name));
      console.log(`check-guidelines: rules/${name}: deleted (not in ${projectRules})`);
    });
}

if (problems.length > 0) {
  console.error(`check-guidelines: ${problems.length} shared file(s) or section(s) out of sync`);
  problems.forEach((problem) => {
    console.error(`  ${problem}`);
  });
  if (!write) {
    console.error(
      "  The boilerplate's apps/web/CLAUDE.md and .claude/rules/ are the source: change one there,",
    );
    console.error('  then copy it here with `bash tools/sync-references.sh`.');
  }
  process.exit(1);
}
console.log(`check-guidelines: references/ agrees with ${claudeMd} and ${projectRules}`);

#!/usr/bin/env node
// Every code block the skills show is copied from the template or the todos fixture, so it can
// never drift from code that passes the gates. This checks that each ts/tsx/js/jsx/css/diff block in
// .claude/skills/*/SKILL.md and references/*.md appears in one of those files verbatim: the
// same consecutive lines, at any indentation. A block whose info string says `sketch`
// (```ts sketch) is a pattern that exists in neither, and is skipped.
//
//   node evals/check-quotes.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skills = join(root, '.claude/skills');
const checked = new Set(['ts', 'tsx', 'js', 'jsx', 'css', 'diff']);
const sourceExt = /\.(ts|tsx|js|jsx|css|diff)$/;

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', 'dist', 'coverage'].includes(entry.name)) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const sources = [join(root, 'evals/fixtures/todos'), join(skills, 'code-skeleton/template')]
  .flatMap(walk)
  .filter((path) => sourceExt.test(path))
  .map((path) => ({ path, lines: readFileSync(path, 'utf8').split(/\r?\n/).map((l) => l.trimEnd()) }));

/** Code blocks of a markdown file: { line, lang, sketch, lines } with the fence's indent removed. */
const blocksOf = (text) => {
  // CRLF checkouts (core.autocrlf) would otherwise hide every fence from the regexes below.
  const lines = text.split(/\r?\n/);
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const open = /^(\s*)```(.*)$/.exec(lines[i]);
    if (!open) continue;
    const [lang = '', ...flags] = open[2].trim().split(/\s+/);
    let j = i + 1;
    while (j < lines.length && !/^\s*```\s*$/.test(lines[j])) j++;
    const body = lines.slice(i + 1, j).map((l) => l.slice(open[1].length).trimEnd());
    blocks.push({ line: i + 1, lang, sketch: flags.includes('sketch'), lines: body });
    i = j;
  }
  return blocks;
};

/** True if `block` equals `lines[at...]` with one constant whitespace prefix added. */
const matchesAt = (block, lines, at) => {
  let indent = null;
  for (let k = 0; k < block.length; k++) {
    const want = block[k];
    const got = lines[at + k];
    if (got === undefined) return false;
    if (want === '') {
      if (got.trim() !== '') return false;
      continue;
    }
    if (indent === null) {
      if (!got.endsWith(want)) return false;
      indent = got.slice(0, got.length - want.length);
      if (indent.trim() !== '') return false;
    } else if (got !== indent + want) {
      return false;
    }
  }
  return true;
};

const findSource = (block) =>
  sources.find(({ lines }) => lines.some((_, at) => matchesAt(block, lines, at)));

const docs = readdirSync(skills).flatMap((skill) => {
  const dir = join(skills, skill);
  const refs = join(dir, 'references');
  let refFiles = [];
  try {
    refFiles = readdirSync(refs).filter((f) => f.endsWith('.md')).map((f) => join(refs, f));
  } catch {
    // A skill without references/.
  }
  return [join(dir, 'SKILL.md'), ...refFiles];
});

let ok = 0;
let sketches = 0;
const misses = [];
for (const doc of docs) {
  let text;
  try {
    text = readFileSync(doc, 'utf8');
  } catch {
    continue;
  }
  for (const block of blocksOf(text)) {
    if (!checked.has(block.lang)) continue;
    if (block.sketch) {
      sketches++;
      continue;
    }
    if (findSource(block.lines)) ok++;
    else misses.push(`${relative(root, doc)}:${block.line} (${block.lang}, ${block.lines.length} lines)`);
  }
}

for (const miss of misses) {
  console.error(`check-quotes: not found verbatim in the template or fixture: ${miss}`);
}
if (misses.length > 0) {
  console.error(
    'check-quotes: copy the block from the file it shows, or mark it ```<lang> sketch if it is a pattern that is in neither.',
  );
  process.exit(1);
}
console.log(`check-quotes: ${ok} quoted blocks match their source, ${sketches} sketches skipped`);

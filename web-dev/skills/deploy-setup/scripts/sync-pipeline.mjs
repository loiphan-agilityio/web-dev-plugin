#!/usr/bin/env node
// Brings the CI/CD pipeline of the react-vite-boilerplate into a project created from it, at the
// commit project-setup pins: the GitHub Actions workflow and its ruleset, the unit and e2e test
// setup (Playwright, Allure, coverage), the Cloudflare Pages files and the tools CI runs. Prints
// JSON: { boilerplate, variant, applied, changes, kept, blocked, leftovers }.
//
//   node sync-pipeline.mjs <project-root>           report what would change, write nothing
//   node sync-pipeline.mjs <project-root> --apply   write it
//
// <project-root> is the monorepo root (pnpm-workspace.yaml, apps/web). The reference is a project
// created by project-setup's create-project.sh in a temporary folder, as the same variant (a web
// app, or a landing page: their pipeline files differ), so BOILERPLATE_REPO and BOILERPLATE_REF
// pick another boilerplate here too. Then:
//
// - owned files (the workflow, Playwright and Allure configs, _headers, the CI tools) are added
//   when missing and replaced when they differ; obsolete ones (netlify.toml) are removed;
// - seeded files (the e2e specs, dependabot.yml) are added only when missing: they are the
//   project's own once written;
// - the root CLAUDE.md gets the reference's "## CI/CD and deploy" section;
// - package.json gets the scripts and devDependencies the pipeline runs, only those it lacks: a
//   value the project changed is kept and listed under `kept`; .gitignore gets the lines it lacks.
//
// A file that would be replaced or removed must be tracked by git with no uncommitted change, so
// `git diff` shows and `git restore` undoes what the sync did. Otherwise it is listed under
// `blocked` and --apply writes nothing at all. `leftovers` lists the other lines that still name
// Netlify, with the reference's wording of the same place as a diff hunk when it has the file.
// Exit 0 when the report or the sync is done, 1 when it is refused (apps/web is not an app from
// the boilerplate, a blocked file), 2 when it cannot run (a wrong path or arguments, no reference),
// with the cause on stderr.
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const createProject = join(here, '../../project-setup/scripts/create-project.sh');
const detectProject = join(here, '../../../scripts/detect-project.mjs');

const owned = [
  '.github/workflows/ci.yml',
  '.github/rulesets/main.json',
  'apps/web/playwright.config.ts',
  'apps/web/allurerc.ts',
  'apps/web/public/_headers',
  'apps/web/public/assets/404.html',
  'tools/check-report.mjs',
  'tools/lib/check-report.mjs',
  'tools/lighthouse.mjs',
  'tools/lib/lighthouse.mjs',
  'tools/test/check-report.test.mjs',
  'tools/test/lighthouse.test.mjs',
];
const seeded = [
  'apps/web/e2e/home.spec.ts',
  'apps/web/e2e/accessibility.spec.ts',
  '.github/dependabot.yml',
];
const obsolete = ['apps/web/netlify.toml'];
const section = { path: 'CLAUDE.md', heading: '## CI/CD and deploy' };
// The scripts and devDependencies the workflow and `pnpm check` run, per package.json.
const packageKeys = {
  'package.json': {
    scripts: [
      'test',
      'build-storybook',
      'test:e2e',
      'test:e2e:install',
      'check',
      'check:report',
      'lighthouse',
      'test:tools',
    ],
    devDependencies: [],
  },
  'apps/web/package.json': {
    scripts: [
      'build',
      'build:mock',
      'preview',
      'test',
      'test:e2e',
      'test:e2e:install',
      'test:e2e:report',
      'build-storybook',
    ],
    devDependencies: [
      '@playwright/test',
      '@axe-core/playwright',
      '@vitest/coverage-v8',
      'allure',
      'allure-playwright',
    ],
  },
};
// Not searched for leftovers: generated, installed or binary.
const skippedDirs = new Set([
  '.git',
  'node_modules',
  '.turbo',
  'dist',
  'dist-e2e',
  'coverage',
  'storybook-static',
  'allure-report',
  'test-results',
  'lighthouse',
]);
const netlify = /netlify/i;

const fail = (message) => {
  console.error(`sync-pipeline: ${message}`);
  process.exit(2);
};

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const positional = args.filter((arg) => arg !== '--apply');
if (positional.length !== 1 || args.some((arg) => arg.startsWith('--') && arg !== '--apply')) {
  fail('usage: sync-pipeline.mjs <project-root> [--apply]');
}
const root = resolve(positional[0]);
if (
  !existsSync(join(root, 'pnpm-workspace.yaml')) ||
  !existsSync(join(root, 'apps/web/package.json'))
) {
  fail(
    `${root} is not the root of a project from the boilerplate (no pnpm-workspace.yaml and apps/web/package.json); from apps/web it is ../..`,
  );
}

// The variant decides which reference to compare with: detect-project.mjs tells them apart.
const detect = spawnSync(process.execPath, [detectProject, join(root, 'apps/web')], {
  encoding: 'utf8',
});
if (detect.status !== 0) fail(`detect-project.mjs failed on apps/web: ${detect.stderr.trim()}`);
const { tier, reasons } = JSON.parse(detect.stdout);
if (tier !== 'template' && tier !== 'landing') {
  console.error(
    `sync-pipeline: apps/web is not an app from the boilerplate (tier ${tier}: ${reasons.join('; ')})`,
  );
  process.exit(1);
}
const variant = tier === 'landing' ? 'landing' : 'auth';

const pinned = /^pinned=(\w+)$/m.exec(readFileSync(createProject, 'utf8'))?.[1];
const boilerplate = {
  repo:
    process.env.BOILERPLATE_REPO ||
    'https://github.com/loiphan-agilityio/react-vite-boilerplate.git',
  ref: process.env.BOILERPLATE_REF || (process.env.BOILERPLATE_REPO ? 'HEAD' : pinned),
};

const tmp = mkdtempSync(join(tmpdir(), 'sync-pipeline-'));
process.on('exit', () => rmSync(tmp, { recursive: true, force: true }));
const ref = join(tmp, 'ref');
const created = spawnSync('bash', [createProject, ref, `--${variant}`], { encoding: 'utf8' });
if (created.status !== 0) {
  fail(
    `create-project.sh could not create the reference: ${(created.stderr || created.stdout).trim()}`,
  );
}

const read = (base, path) =>
  existsSync(join(base, path)) ? readFileSync(join(base, path), 'utf8') : undefined;
const git = (...gitArgs) => spawnSync('git', ['-C', root, ...gitArgs], { encoding: 'utf8' });
const inGit = git('rev-parse', '--is-inside-work-tree').stdout.trim() === 'true';
/** True when git tracks <path> and it has no uncommitted change: git restore can undo the sync. */
const restorable = (path) =>
  inGit &&
  git('ls-files', '--error-unmatch', '--', path).status === 0 &&
  git('status', '--porcelain', '--', path).stdout === '';

/** @type {{ path: string, action: string, detail: string }[]} */
const changes = [];
/** @type {{ path: string, detail: string }[]} */
const kept = [];
/** @type {{ path: string, detail: string }[]} */
const blocked = [];
/** The new text of each file the sync writes (undefined: removed). */
const next = new Map();

const change = (path, action, detail, text) => {
  if (action !== 'add' && !restorable(path)) {
    blocked.push({
      path,
      detail: inGit ? 'uncommitted changes, or not tracked by git' : 'not a git repository',
    });
  }
  changes.push({ path, action, detail });
  next.set(path, text);
};

for (const path of owned) {
  const want = read(ref, path);
  const have = read(root, path);
  if (want === undefined || want === have) continue;
  change(
    path,
    have === undefined ? 'add' : 'update',
    have === undefined ? 'from the boilerplate' : "replaced by the boilerplate's",
    want,
  );
}
for (const path of seeded) {
  const want = read(ref, path);
  if (want !== undefined && read(root, path) === undefined)
    change(path, 'add', 'from the boilerplate (the project owns it from now on)', want);
}
for (const path of obsolete) {
  if (read(root, path) !== undefined && read(ref, path) === undefined)
    change(path, 'remove', 'replaced by the files above', undefined);
}

/** The text from `heading` to the next `## ` heading, or undefined. */
const sectionOf = (text, heading) => {
  const start = text.indexOf(`\n${heading}\n`);
  if (start === -1) return undefined;
  const end = text.indexOf('\n## ', start + heading.length + 2);

  return text.slice(start + 1, end === -1 ? text.length : end + 1);
};
{
  const want = sectionOf(read(ref, section.path) ?? '', section.heading);
  const text = read(root, section.path);
  const have = text === undefined ? undefined : sectionOf(text, section.heading);
  if (want !== undefined && text === undefined) {
    change(section.path, 'add', `the "${section.heading}" section`, `${want}`);
  } else if (want !== undefined && have === undefined) {
    change(
      section.path,
      'section',
      `"${section.heading}" appended`,
      `${text.trimEnd()}\n\n${want}`,
    );
  } else if (want !== undefined && have !== want) {
    change(
      section.path,
      'section',
      `"${section.heading}" replaced by the boilerplate's`,
      text.replace(have, want),
    );
  }
}

for (const [path, keys] of Object.entries(packageKeys)) {
  const text = read(root, path);
  const want = JSON.parse(read(ref, path));
  let pkg;
  try {
    pkg = JSON.parse(text);
  } catch {
    fail(`${path} is not valid JSON`);
  }
  const added = [];
  for (const [field, names] of Object.entries(keys)) {
    for (const name of names) {
      const value = want[field]?.[name];
      if (value === undefined) continue;
      if (pkg[field]?.[name] === undefined) {
        pkg[field] = { ...pkg[field], [name]: value };
        added.push(`${field}.${name}`);
      } else if (pkg[field][name] !== value) {
        kept.push({
          path,
          detail: `${field}.${name} is "${pkg[field][name]}", the boilerplate's "${value}"`,
        });
      }
    }
  }
  if (added.length > 0) {
    // pnpm keeps dependencies sorted by name.
    pkg.devDependencies = Object.fromEntries(
      Object.entries(pkg.devDependencies ?? {}).sort(([a], [b]) => a.localeCompare(b)),
    );
    change(
      path,
      'merge',
      `added ${added.join(', ')} (pnpm install updates the lockfile)`,
      `${JSON.stringify(pkg, null, 2)}\n`,
    );
  }
}

{
  const lines = (text) => (text ?? '').split('\n').map((line) => line.trim());
  const have = new Set(lines(read(root, '.gitignore')));
  const missing = lines(read(ref, '.gitignore')).filter(
    (line) => line !== '' && !line.startsWith('#') && !have.has(line),
  );
  if (missing.length > 0) {
    const text = read(root, '.gitignore');
    const body = `${missing.join('\n')}\n`;
    if (text === undefined) change('.gitignore', 'add', `ignores ${missing.join(', ')}`, body);
    else
      change('.gitignore', 'merge', `ignores ${missing.join(', ')}`, `${text.trimEnd()}\n${body}`);
  }
}

/** Every text file of the project, as paths relative to the root. */
const projectFiles = (dir = root) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    // The companion skills in .claude/skills are third-party text, not the project's.
    if (entry.isDirectory()) {
      return skippedDirs.has(entry.name) || relative(root, path) === join('.claude', 'skills')
        ? []
        : projectFiles(path);
    }
    if (!entry.isFile() || entry.name === 'pnpm-lock.yaml' || statSync(path).size > 1_000_000)
      return [];

    return [relative(root, path)];
  });
/** The -U0 hunks of `git diff` from <text> to the reference's <path> that remove a Netlify line. */
const referenceHunks = (path, text) => {
  if (read(ref, path) === undefined) return [];
  const mine = join(tmp, 'mine');
  writeFileSync(mine, text);
  const diff = spawnSync(
    'git',
    ['diff', '--no-index', '--no-color', '-U0', '--', mine, join(ref, path)],
    { encoding: 'utf8' },
  );

  return diff.stdout
    .split(/^(?=@@ )/m)
    .slice(1)
    .filter((hunk) => hunk.split('\n').some((line) => line.startsWith('-') && netlify.test(line)));
};
const leftovers = [];
for (const path of projectFiles()) {
  if (next.has(path) && next.get(path) === undefined) continue;
  const text = next.has(path) ? next.get(path) : readFileSync(join(root, path), 'utf8');
  if (text.includes('\0') || !netlify.test(text)) continue;
  const lines = text
    .split('\n')
    .map((line, index) => ({ line: index + 1, text: line.trim() }))
    .filter(({ text: line }) => netlify.test(line));
  leftovers.push({ path, lines, reference: referenceHunks(path, text) });
}

const report = { boilerplate, variant, applied: false, changes, kept, blocked, leftovers };
if (apply && blocked.length === 0) {
  for (const [path, text] of next) {
    const target = join(root, path);
    if (text === undefined) {
      rmSync(target);
    } else {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, text);
    }
  }
  report.applied = true;
}
console.log(JSON.stringify(report, null, 2));
process.exit(blocked.length > 0 ? 1 : 0);

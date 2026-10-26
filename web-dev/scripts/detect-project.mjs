#!/usr/bin/env node
// Describes the project in <dir> as JSON, so the develop skill can pick a workflow from facts
// instead of guesses: what is in the folder, the package manager, the library versions, the
// scripts, and the support tier.
//
//   node detect-project.mjs [dir]        dir defaults to the current directory
//
// Tiers:
//   new          an empty folder (or one holding only .git/, .claude/, design/, DESIGN.md), or a
//                non-empty folder without package.json (the app goes in a subfolder)
//   template     an app from the boilerplate (apps/web): ApiClient,
//                src/test/render.tsx and effect
//   landing      a landing page from the boilerplate (apps/web, create-project.sh --landing):
//                @repo/ui and src/test/render.tsx, but no API layer and no Effect
//   same-stack   the template's stack (React, Vite, Effect, TanStack Query, React Hook Form),
//                another layout
//   other-stack  a React app on another stack (axios, zod, Redux, another router...)
//   unsupported  not React, Next.js or another SSR framework, or a monorepo root
//
// Exits 2 when <dir> does not exist or is not a folder, and 1 when its package.json is not valid
// JSON, with the cause on stderr and nothing on stdout.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const dir = resolve(process.argv[2] ?? '.');
if (!existsSync(dir)) {
  console.error(`detect-project: ${dir} does not exist`);
  process.exit(2);
}
// A file is no project folder either; readdirSync would throw and exit 1, the broken-JSON code.
if (!statSync(dir).isDirectory()) {
  console.error(`detect-project: ${dir} is not a folder`);
  process.exit(2);
}

/** @type {(path: string) => any} */
const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
};

/** @type {(path: string) => string} */
const readText = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : '');

const ignoredWhenEmpty = new Set(['.git', '.claude', 'design', 'DESIGN.md', '.DS_Store']);
const entries = readdirSync(dir).filter((name) => !ignoredWhenEmpty.has(name));
const pkg = readJson(join(dir, 'package.json'));
// A broken package.json is not "no project": report it instead of treating the folder as new.
if (pkg === undefined && existsSync(join(dir, 'package.json'))) {
  console.error(`detect-project: ${join(dir, 'package.json')} is not valid JSON`);
  process.exit(1);
}
const state = pkg ? 'app' : entries.length === 0 ? 'empty' : 'other';

/** @type {Record<string, string>} */
const declared = { ...pkg?.dependencies, ...pkg?.devDependencies };

/** @type {(range: string | undefined) => number | undefined} */
const majorOf = (range) => {
  const [, major] = /(\d+)/.exec(range ?? '') ?? [];
  return major === undefined ? undefined : Number(major);
};

const watched = [
  'react',
  'vite',
  'typescript',
  'effect',
  '@tanstack/react-query',
  'react-hook-form',
  'react-router',
  'react-router-dom',
  '@tanstack/react-router',
  'zod',
  'axios',
  'msw',
  'vitest',
  'jest',
  'tailwindcss',
  'storybook',
  'next',
  'vue',
  '@angular/core',
  'svelte',
];
/** @type {Record<string, { declared: string, installed: string | null }>} */
const versions = Object.fromEntries(
  watched
    .filter((name) => declared[name] !== undefined)
    .map((name) => [
      name,
      {
        declared: declared[name],
        installed: readJson(join(dir, 'node_modules', name, 'package.json'))?.version ?? null,
      },
    ]),
);

const lockfiles = {
  'pnpm-lock.yaml': 'pnpm',
  'package-lock.json': 'npm',
  'yarn.lock': 'yarn',
  'bun.lock': 'bun',
  'bun.lockb': 'bun',
};
/** @type {(at: string) => string | undefined} */
const packageManagerIn = (at) =>
  /^(\w+)@/.exec(readJson(join(at, 'package.json'))?.packageManager ?? '')?.[1] ??
  Object.entries(lockfiles).find(([file]) => existsSync(join(at, file)))?.[1];
// A package inside a pnpm or yarn workspace has no lockfile of its own: the workspace root (a
// pnpm-workspace.yaml, or a package.json with `workspaces`) holds it. Outside a workspace only
// <dir> counts, so a stray lockfile in a parent folder decides nothing.
/** @type {() => string[]} */
const foldersUpToWorkspaceRoot = () => {
  /** @type {string[]} */
  const folders = [];
  for (let at = dir; ; at = dirname(at)) {
    folders.push(at);
    if (
      existsSync(join(at, 'pnpm-workspace.yaml')) ||
      readJson(join(at, 'package.json'))?.workspaces !== undefined
    ) {
      return folders;
    }
    if (dirname(at) === at) return [dir];
  }
};
const packageManager =
  foldersUpToWorkspaceRoot()
    .map(packageManagerIn)
    .find((name) => name !== undefined) ?? (pkg ? 'npm' : null);

// What makes an app from the boilerplate (the `template` and `landing` tiers).
const markers = {
  apiClient: readText(join(dir, 'src/lib/api/client.ts')).includes('ApiClient'),
  testRender: existsSync(join(dir, 'src/test/render.tsx')),
};
const workspaces =
  pkg?.workspaces !== undefined || /^packages:/m.test(readText(join(dir, 'pnpm-workspace.yaml')));

const has = (/** @type {string} */ name) => declared[name] !== undefined;
// Other frameworks, and React behind an SSR framework: the skills write client-side SPAs only.
const otherFrameworks = [
  'next',
  'vue',
  '@angular/core',
  'svelte',
  '@remix-run/react',
  'gatsby',
  'astro',
  '@tanstack/react-start',
];
/** @type {string[]} */
const reasons = [];

/** @type {() => string} */
const tierOf = () => {
  if (!pkg) {
    reasons.push(
      state === 'empty' ? 'empty folder' : 'no package.json: build the app in a subfolder',
    );
    return 'new';
  }
  const other = otherFrameworks.filter(has);
  if (other.length > 0) {
    reasons.push(`not supported: ${other.join(', ')}`);
    return 'unsupported';
  }
  if (workspaces) {
    reasons.push('monorepo root: run in the app package');
    return 'unsupported';
  }
  if (!has('react')) {
    reasons.push('no react dependency');
    return 'unsupported';
  }
  // A landing page from the boilerplate keeps its UI kit and test helpers but drops the data
  // stack. Every part is required, so a web app from the boilerplate (it has Effect and ApiClient)
  // and a project from elsewhere (no @repo/ui) never land here.
  if (
    has('vite') &&
    has('@repo/ui') &&
    markers.testRender &&
    !markers.apiClient &&
    !has('effect')
  ) {
    reasons.push(
      'landing page from the boilerplate: @repo/ui and src/test/render.tsx, no API layer or Effect',
    );
    return 'landing';
  }
  const stack = ['vite', 'effect', '@tanstack/react-query', 'react-hook-form'];
  const missing = stack.filter((name) => !has(name));
  if (missing.length > 0) {
    reasons.push(`React on another stack: no ${missing.join(', ')}`);
    return 'other-stack';
  }
  if (markers.apiClient && markers.testRender) {
    reasons.push('template layout: ApiClient and src/test/render.tsx');
    return 'template';
  }
  reasons.push(
    'same stack, other layout: no src/lib/api/client.ts ApiClient or src/test/render.tsx',
  );
  return 'same-stack';
};
const tier = tierOf();

// Majors this plugin is written for (references/stack-guidelines.md); a different one is reported.
const expectedMajors = {
  react: 19,
  vite: 8,
  typescript: 6,
  effect: 4,
  '@tanstack/react-query': 5,
  'react-hook-form': 7,
  'react-router': 8,
  msw: 3,
  vitest: 5,
  tailwindcss: 4,
};
// pnpm's `catalog:` names no version: the catalogs of the nearest pnpm-workspace.yaml do (the
// boilerplate's apps/web declares react, typescript and tailwindcss that way). The default catalog
// is `catalog:` or `catalogs: default:`; `catalog:<name>` reads `catalogs: <name>:`. Block-style
// YAML only, which is what pnpm writes.
/** @type {(lines: string[], key: string) => string[]} */
const blockOf = (lines, key) => {
  const start = lines.findIndex((line) => new RegExp(`^${key}:\\s*(#.*)?$`).test(line));
  /** @type {string[]} */
  const block = [];
  for (const line of start < 0 ? [] : lines.slice(start + 1)) {
    // A blank line or a comment, even at column 0, does not end the block.
    if (/^\s*(#.*)?$/.test(line)) continue;
    if (/^\S/.test(line)) break;
    block.push(line);
  }
  return block;
};
const yamlEntry = /^(\s+)['"]?([^'":\s]+)['"]?:\s*(?:['"]?([^'"#\s]+))?/;
/** @type {() => Record<string, Record<string, string>>} */
const workspaceCatalogs = () => {
  for (let at = dir; ; at = dirname(at)) {
    const yaml = readText(join(at, 'pnpm-workspace.yaml'));
    if (yaml) {
      const lines = yaml.split(/\r?\n/);
      /** @type {Record<string, Record<string, string>>} */
      const catalogs = {};
      /** @type {(name: string, key: string, range: string) => void} */
      const add = (name, key, range) => {
        catalogs[name] = { ...catalogs[name], [key]: range };
      };
      for (const line of blockOf(lines, 'catalog')) {
        const [, , key, range] = yamlEntry.exec(line) ?? [];
        if (key && range) add('default', key, range);
      }
      // catalogs: one level of catalog names, each holding its entries one level deeper.
      /** @type {number | undefined} */
      let nameIndent;
      let name = '';
      for (const line of blockOf(lines, 'catalogs')) {
        const [, indent = '', key, range] = yamlEntry.exec(line) ?? [];
        if (!key) continue;
        nameIndent ??= indent.length;
        if (indent.length <= nameIndent) name = key;
        else if (range) add(name, key, range);
      }
      return catalogs;
    }
    if (dirname(at) === at) return {};
  }
};
const catalogs = workspaceCatalogs();
// The installed version decides; a range such as `>=18` names no single major.
/** @type {(name: string) => string | undefined} */
const actualVersion = (name) => {
  const installed = versions[name]?.installed;
  if (installed) return installed;
  const [, catalogName] = /^catalog:(.*)$/.exec(declared[name] ?? '') ?? [];
  if (catalogName === undefined) return declared[name];
  // A catalog this script cannot resolve names no version: undefined keeps it out of otherMajors.
  return catalogs[catalogName.trim() || 'default']?.[name];
};
const otherMajors = Object.entries(expectedMajors)
  .filter(([name]) => has(name) && actualVersion(name) !== undefined)
  .filter(([name, major]) => majorOf(actualVersion(name)) !== major)
  .map(([name, major]) => `${name} ${actualVersion(name)} (guidelines: ${major})`);

const result = {
  dir,
  state,
  tier,
  reasons,
  packageManager,
  versions,
  otherMajors,
  scripts: Object.keys(pkg?.scripts ?? {}),
};
console.log(JSON.stringify(result, null, 2));

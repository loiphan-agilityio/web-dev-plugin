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
//   template     an app from the boilerplate (apps/web) or the 0.1.0 template: ApiClient,
//                src/test/render.tsx and effect
//   same-stack   the template's stack (React, Vite, Effect, TanStack Query, React Hook Form),
//                another layout
//   other-stack  a React app on another stack (axios, zod, Redux, another router...)
//   unsupported  not React, Next.js or another SSR framework, or a monorepo root
//
// Exits 2 when <dir> does not exist and 1 when its package.json is not valid JSON, with the cause
// on stderr and nothing on stdout.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dir = resolve(process.argv[2] ?? '.');
if (!existsSync(dir)) {
  console.error(`detect-project: ${dir} does not exist`);
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
const packageManager =
  /^(\w+)@/.exec(pkg?.packageManager ?? '')?.[1] ??
  Object.entries(lockfiles).find(([file]) => existsSync(join(dir, file)))?.[1] ??
  (pkg ? 'npm' : null);

const markers = {
  apiClient: readText(join(dir, 'src/lib/api/client.ts')).includes('ApiClient'),
  testRender: existsSync(join(dir, 'src/test/render.tsx')),
  featuresDir: existsSync(join(dir, 'src/features')),
  shadcn: existsSync(join(dir, 'components.json')),
  claudeMd: existsSync(join(dir, 'CLAUDE.md')),
  agentsMd: existsSync(join(dir, 'AGENTS.md')),
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
// The installed version decides; a range such as `>=18` names no single major.
const actualVersion = (/** @type {string} */ name) => versions[name]?.installed ?? declared[name];
const otherMajors = Object.entries(expectedMajors)
  .filter(([name, major]) => has(name) && majorOf(actualVersion(name)) !== major)
  .map(([name, major]) => `${name} ${actualVersion(name)} (guidelines: ${major})`);

const gates = ['check', 'lint', 'typecheck', 'test', 'build'];
const result = {
  dir,
  state,
  tier,
  reasons,
  packageManager,
  versions,
  otherMajors,
  markers,
  scripts: Object.keys(pkg?.scripts ?? {}),
  missingGates: pkg ? gates.slice(1).filter((name) => pkg.scripts?.[name] === undefined) : [],
};
console.log(JSON.stringify(result, null, 2));

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { check, tokenize } from '../guard.mjs';

const script = fileURLToPath(new URL('../guard.mjs', import.meta.url));
const cwd = mkdtempSync(join(tmpdir(), 'guard-'));

writeFileSync(join(cwd, '.env'), 'API_KEY=fake\n');
after(() => rmSync(cwd, { recursive: true, force: true }));

const bash = (command) => check({ tool_name: 'Bash', tool_input: { command }, cwd });
const tool = (tool_name, tool_input) => check({ tool_name, tool_input, cwd });

describe('guard: tokenize', () => {
  it('keeps a quoted message as one word', () => {
    assert.deepEqual(tokenize('git commit -m "docs: never use --no-verify"'), [['git', 'commit', '-m', 'docs: never use --no-verify']]);
  });

  it('splits on ; && || | and newlines', () => {
    assert.deepEqual(tokenize('a; b && c || d | e\nf').map((s) => s[0]), ['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('makes a redirect its own word', () => {
    assert.deepEqual(tokenize('echo x >>.env 2>&1'), [['echo', 'x', '>>', '.env', '>&', '1']]);
  });
});

describe('guard: git', () => {
  for (const command of [
    'git commit --amend -m "feat: add work"',
    'git commit --amend --only -m x',
    'git -C app commit -a --amend',
    'git reset --hard HEAD~1',
    'git rebase -i main',
    'GIT_EDITOR=true git rebase --continue',
    'git push --force origin main',
    'git push origin main --force',
    'git push -f',
    'git push -uf origin main',
    'git push --force-with-lease',
    'git push origin +main',
    'git push origin +HEAD:main',
    'git push origin --delete main',
    'git push origin :main',
    'git commit -m "feat: x" --no-verify',
    'git commit -m "fix: x" -n',
    'git commit -anm x',
    'HUSKY=0 git commit -m x',
    'git -c core.hooksPath=/dev/null commit -m x',
    'git push --no-verify',
    'git merge --no-verify feat',
    'git branch -f main HEAD~2',
    'git branch --force main HEAD~2',
    'git branch -D old',
    'git branch -M main',
    'git branch --delete --force old',
    'git status && git commit --amend',
    'sh -c "git commit --amend"',
    "bash -lc 'git push --force'",
  ]) {
    it(`refuses ${command}`, () => assert.ok(bash(command)));
  }

  for (const command of [
    'git commit -m "feat: add work"',
    'git commit -am "docs: never use --no-verify or --amend"',
    'git commit -m "chore: run rebase; then push --force"',
    'git push -u origin feat/412-search',
    'git reset HEAD README.md',
    'git log --oneline',
    'git log --grep=rebase',
    'git branch -d merged',
    'git switch -c docs/ticket-412',
    'echo "--no-verify"',
    'pnpm check',
  ]) {
    it(`allows ${command}`, () => assert.equal(bash(command), undefined));
  }
});

describe('guard: secret files', () => {
  for (const file_path of ['/app/.env', '/app/.env.local', '/app/.envrc', '/app/.dev.vars', '/app/.npmrc', '/k/server.key', '/k/cert.pem', '/h/.ssh/id_ed25519']) {
    it(`refuses Read ${file_path}`, () => assert.ok(tool('Read', { file_path })));
  }

  it('refuses Edit .env', () => assert.ok(tool('Edit', { file_path: join(cwd, '.env') })));
  it('refuses MultiEdit .env', () => assert.ok(tool('MultiEdit', { file_path: join(cwd, '.env') })));
  it('refuses Write over an existing .env', () => assert.ok(tool('Write', { file_path: join(cwd, '.env') })));
  it('refuses Grep in .env', () => assert.ok(tool('Grep', { pattern: 'KEY', path: '.env' })));
  it('refuses cat .env', () => assert.ok(bash('cat .env')));
  it("refuses grep API_KEY '.env.local'", () => assert.ok(bash("grep API_KEY '.env.local'")));
  it('refuses echo > an existing .env', () => assert.ok(bash('echo API_KEY=x > .env')));
  it('refuses tee .env', () => assert.ok(bash('echo x | tee .env')));
  it('refuses < .env', () => assert.ok(bash('wc -l < .env')));
  it('refuses cp .env elsewhere', () => assert.ok(bash('cp .env /tmp/leak')));
  it('refuses cp over an existing .env', () => assert.ok(bash('cp .env.example .env')));

  it('allows Read .env.example', () => assert.equal(tool('Read', { file_path: '/app/.env.example' }), undefined));
  it('allows Read src/env.ts', () => assert.equal(tool('Read', { file_path: '/app/src/env.ts' }), undefined));
  it('allows Write of a new .env.local', () => assert.equal(tool('Write', { file_path: join(cwd, '.env.local') }), undefined));
  it('allows cp .env.example to a new .env.local', () => assert.equal(bash('cp .env.example .env.local'), undefined));
  it('allows Grep in a folder', () => assert.equal(tool('Grep', { pattern: 'x', path: 'src' }), undefined));
});

describe('guard: as a hook', () => {
  const run = (input, path = script) => spawnSync(process.execPath, [path], { input, encoding: 'utf8' });
  const amend = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git commit --amend' } });

  it('exits 2 with the reason on stderr', () => {
    const { status, stderr } = run(amend);

    assert.equal(status, 2);
    assert.match(stderr, /Blocked by the web-dev guardrails: git commit --amend/);
  });

  it('still runs when reached through a symlink', () => {
    const link = join(cwd, 'guard-link.mjs');

    symlinkSync(script, link);
    assert.equal(run(amend, link).status, 2);
  });

  it('exits 0 for an allowed command', () => {
    assert.equal(run(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git status' } })).status, 0);
  });

  it('exits 0 on input it cannot parse', () => assert.equal(run('not json').status, 0));
});

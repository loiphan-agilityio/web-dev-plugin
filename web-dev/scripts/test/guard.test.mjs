import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
    'git rebase main',
    'git rebase --skip',
    'git rebase --continue --exec true',
    'git rebase --abort --no-verify',
    'git clean -fdx',
    'git clean -f',
    'git clean --force -d',
    'git checkout -- .',
    'git checkout -- src/app.tsx',
    'git checkout HEAD~1 -- src/app.tsx',
    'git checkout .',
    'git restore .',
    'git restore src/app.tsx',
    'git restore --source=HEAD~1 src/app.tsx',
    'git restore --staged --worktree src/app.tsx',
    'git restore -SW src/app.tsx',
    'git checkout -f main',
    'git checkout --force',
    'git switch --discard-changes main',
    'git switch -f main',
    'git stash drop',
    'git stash drop stash@{1}',
    'git stash clear',
    'env git push --force',
    'env -i PATH=/usr/bin git push --force',
    'env -u GIT_DIR git commit --amend',
    'env HUSKY=0 git commit -m x',
    'sudo git push --force',
    'sudo -u deploy git push --force',
    'sudo -Eu deploy git push --force',
    'sudo -E env git reset --hard',
    'command git commit --amend',
    'nohup git push -f',
    'time git rebase main',
    'time -p git reset --hard',
    'exec git push --force',
    'exec -a g git push --force',
    'FOO=1 env BAR=2 git commit --amend',
    'sudo sh -c "git commit --amend"',
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
    'git rebase --continue',
    'GIT_EDITOR=true git rebase --continue',
    'git rebase --abort',
    'git clean -n',
    'git clean -nfd',
    'git clean --dry-run -fdx',
    'git checkout main',
    'git checkout -b feat/x',
    'git checkout main --',
    'git checkout -',
    'git checkout -b feat/x origin/main',
    'git checkout --track origin/feat/x',
    'git stash',
    'git stash push -u -m wip',
    'git stash pop',
    'git stash list',
    'git switch main',
    'git restore --staged src/app.tsx',
    'git restore -S .',
    'env',
    'env FOO=1 git status',
    'sudo git status',
    'command -v git',
    'time pnpm check',
    'git switch -c docs/ticket-412',
    'echo "--no-verify"',
    'pnpm check',
  ]) {
    it(`allows ${command}`, () => assert.equal(bash(command), undefined));
  }
});

describe('guard: git checkout of a path', () => {
  const repo = mkdtempSync(join(tmpdir(), 'guard-checkout-'));
  const sh = (...args) => execFileSync('git', args, { cwd: repo, stdio: 'ignore' });
  const at = (command) => check({ tool_name: 'Bash', tool_input: { command }, cwd: repo });

  sh('init', '-q', '-b', 'main');
  mkdirSync(join(repo, 'src'));
  mkdirSync(join(repo, 'docs'));
  writeFileSync(join(repo, 'src/app.tsx'), 'export {};\n');
  writeFileSync(join(repo, 'docs/plan.md'), '# Plan\n');
  sh('add', '.');
  sh('-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-q', '-m', 'chore: base');
  sh('branch', 'feat/x');
  sh('branch', 'docs');
  after(() => rmSync(repo, { recursive: true, force: true }));

  for (const command of ['git checkout src/app.tsx', 'git checkout src', 'git checkout main src/app.tsx', 'git checkout feat/x docs/plan.md', 'git -C src checkout app.tsx']) {
    it(`refuses ${command}`, () => assert.ok(at(command)));
  }

  // `docs` is a branch and a folder: git takes it as the branch.
  for (const command of ['git checkout feat/x', 'git checkout docs', 'git checkout HEAD~0', 'git checkout not-here-yet', 'git checkout -b fix/y main']) {
    it(`allows ${command}`, () => assert.equal(at(command), undefined));
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

  for (const command of [
    'grep SECRET .env',
    'rg foo .env.local',
    'grep -n KEY src/a.ts .env',
    'grep -e KEY .env',
    'grep -ne KEY .env',
    'grep --regexp=KEY .env',
    'grep -f .env src/a.ts',
    'grep --file=.env src/a.ts',
    'grep -A 3 KEY .env',
    'grep -A3 KEY .env',
    'grep --color KEY .env',
    'grep -- KEY .env',
    'grep KEY -- .env',
    'grep 2>/dev/null KEY .env',
    'egrep KEY .env',
    'rg -g "*.ts" -t ts KEY .env',
    'rg --glob=!dist -e KEY .env',
    'sudo cat .env',
    'env grep KEY .env',
  ]) {
    it(`refuses ${command}`, () => assert.ok(bash(command)));
  }

  for (const command of [
    'rg -n .env src',
    'grep -n "\\.env" .gitignore',
    'grep .env',
    'grep -e .env .gitignore',
    'grep -rne .env src',
    'grep --regexp .env src',
    'grep -A 3 .env README.md',
    'grep -- .env README.md',
    'rg -g .env.* -t ts .env src',
    'rg --glob .env.* --type-not md .env',
    'rg --color never .env src',
    'rg .env > found.txt',
  ]) {
    it(`allows ${command}`, () => assert.equal(bash(command), undefined));
  }

  // The limit the guardrails skill states: a recursive search reads the secret files in its way.
  it('does not see a recursive grep -r', () => assert.equal(bash('grep -r API_KEY .'), undefined));

  it('allows Read .env.example', () => assert.equal(tool('Read', { file_path: '/app/.env.example' }), undefined));
  it('allows Read src/env.ts', () => assert.equal(tool('Read', { file_path: '/app/src/env.ts' }), undefined));
  it('allows Write of a new .env.local', () => assert.equal(tool('Write', { file_path: join(cwd, '.env.local') }), undefined));
  it('allows cp .env.example to a new .env.local', () => assert.equal(bash('cp .env.example .env.local'), undefined));
  it('allows Grep in a folder', () => assert.equal(tool('Grep', { pattern: 'x', path: 'src' }), undefined));
});

describe('guard: release gate', () => {
  // A repository whose origin/main has one commit, plus a commit on a branch that is not merged.
  const repo = mkdtempSync(join(tmpdir(), 'guard-release-'));
  const remote = mkdtempSync(join(tmpdir(), 'guard-remote-'));
  const sh = (...args) => execFileSync('git', args, { cwd: repo, stdio: 'ignore' });

  execFileSync('git', ['init', '-q', '--bare', remote]);
  sh('init', '-q', '-b', 'main');
  sh('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'one');
  sh('remote', 'add', 'origin', remote);
  sh('push', '-q', 'origin', 'main');
  sh('tag', 'v1.0.0');
  sh('switch', '-q', '-c', 'feat/x');
  sh('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'two');
  sh('tag', 'v1.1.0');
  after(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(remote, { recursive: true, force: true });
  });

  const run = (command) => check({ tool_name: 'Bash', tool_input: { command }, cwd: repo });

  for (const command of [
    'git push origin main',
    'git push origin HEAD:main',
    'git push origin feat/x:refs/heads/production',
    'git push origin v1.1.0',
    'git push origin tag v1.1.0',
    'git push origin refs/tags/v1.1.0',
    'git push --tags',
    'git push --follow-tags origin feat/x',
    'gh pr merge 41 --squash',
    'gh pr review 41 --approve',
    'gh api -X PUT repos/o/r/pulls/41/merge',
    'glab mr merge 7',
    'glab mr approve 7',
    'npx -y wrangler@4.149.0 pages deploy apps/web/dist --project-name app --branch main',
    'wrangler pages deploy dist --project-name app --branch=production',
    'pnpm dlx wrangler pages deployment create dist --project-name app --branch main',
    'npx wrangler pages deploy dist --project-name app',
    'npx wrangler pages deployment delete abc123 --project-name app',
  ]) {
    it(`refuses ${command}`, () => assert.ok(run(command)));
  }

  for (const command of [
    'git push -u origin feat/x',
    'git push origin v1.0.0',
    'git push origin tag v1.0.0',
    'gh pr create --draft --fill',
    'gh pr ready 41',
    'gh pr view 41 --json state',
    'gh run watch 123',
    'npx -y wrangler@4.149.0 pages deploy apps/web/dist --project-name app --branch release-check',
    'npx wrangler pages deployment list --project-name app',
    'npx vitest run',
  ]) {
    it(`allows ${command}`, () => assert.equal(run(command), undefined));
  }

  it('refuses PROTECTED_BRANCHES=none git push origin main once main exists', () => {
    assert.ok(run('PROTECTED_BRANCHES=none git push -u origin main'));
  });

  it('allows PROTECTED_BRANCHES=none to create main in an empty repository', () => {
    const empty = mkdtempSync(join(tmpdir(), 'guard-empty-'));
    execFileSync('git', ['init', '-q', '--bare', empty]);
    sh('remote', 'add', 'empty', empty);
    assert.equal(run('PROTECTED_BRANCHES=none git push -u empty main'), undefined);
    assert.ok(run('git push -u empty main'));
    assert.ok(run('env PROTECTED_BRANCHES=none git push -u empty main'));
    assert.ok(run('PROTECTED_BRANCHES=none sudo git push -u empty main'));
    assert.ok(run('sudo git push -u empty main'));
    rmSync(empty, { recursive: true, force: true });
  });

  for (const command of [
    'git push origin HEAD',
    'git push -u origin @',
    'git push origin HEAD:HEAD',
    'gh -R o/r pr merge 41 --squash',
    'gh --repo=o/r pr merge 41',
    "gh api graphql -f query='mutation{mergePullRequest(input:{pullRequestId:\"x\"}){clientMutationId}}'",
    "gh api graphql -f query='mutation{enablePullRequestAutoMerge(input:{pullRequestId:\"x\"}){clientMutationId}}'",
    'glab api -X PUT projects/1/merge_requests/7/merge',
    'npm exec -- wrangler pages deploy dist --project-name app --branch main',
    'PROTECTED_BRANCHES=none git push -u https://invalid.example/x.git main',
  ]) {
    it(`refuses on main: ${command}`, () => {
      sh('switch', '-q', 'main');
      try {
        assert.ok(run(command));
      } finally {
        sh('switch', '-q', 'feat/x');
      }
    });
  }

  it('allows git push origin HEAD on a feature branch', () => assert.equal(run('git push -u origin HEAD'), undefined));
  it('reads the remote after -o <option>', () => assert.equal(run('git push -o ci.skip origin v1.0.0'), undefined));
  it('reads --repo as the remote', () => assert.equal(run('git push --repo origin v1.0.0'), undefined));

  it('checks the tag in the -C repository, not the hook cwd', () => {
    assert.equal(check({ tool_name: 'Bash', tool_input: { command: `git -C ${repo} push origin v1.0.0` }, cwd }), undefined);
    assert.ok(check({ tool_name: 'Bash', tool_input: { command: `git -C ${repo} push origin v1.1.0` }, cwd }));
  });

  it('uses the remote default branch when it is master', () => {
    const other = mkdtempSync(join(tmpdir(), 'guard-master-'));
    const bare = mkdtempSync(join(tmpdir(), 'guard-master-remote-'));
    const g = (...args) => execFileSync('git', args, { cwd: other, stdio: 'ignore' });
    execFileSync('git', ['init', '-q', '--bare', bare]);
    g('init', '-q', '-b', 'master');
    g('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'one');
    g('remote', 'add', 'origin', bare);
    g('push', '-q', 'origin', 'master');
    g('tag', 'v2.0.0');
    assert.equal(check({ tool_name: 'Bash', tool_input: { command: 'git push origin v2.0.0' }, cwd: other }), undefined);
    rmSync(other, { recursive: true, force: true });
    rmSync(bare, { recursive: true, force: true });
  });

  it('refuses a bare git push on main', () => {
    sh('switch', '-q', 'main');
    assert.ok(run('git push'));
    sh('switch', '-q', 'feat/x');
  });
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

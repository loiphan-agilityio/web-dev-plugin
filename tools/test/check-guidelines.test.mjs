import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../check-guidelines.mjs', import.meta.url));
const base = mkdtempSync(join(tmpdir(), 'check-guidelines-'));

after(() => rmSync(base, { recursive: true, force: true }));

const section = '## Library versions\n\n- react 19\n';
const stack = `# Stack\n\nPreamble.\n\n${section}`;

/** @type {(path: string, content: string) => void} */
const put = (path, content) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
};

let count = 0;

/**
 * Builds references/ and a project in a fresh folder.
 * @type {(opts?: { rules?: Record<string, string> | null, copies?: Record<string, string>, claudeSection?: string }) => { refs: string, claudeMd: string, root: string }}
 */
const setup = ({
  rules = { 'a.md': '# A\n' },
  copies = { 'a.md': '# A\n' },
  claudeSection = section,
} = {}) => {
  count += 1;
  const root = join(base, String(count), 'project');
  const refs = join(base, String(count), 'references');
  const claudeMd = join(root, 'apps', 'web', 'CLAUDE.md');
  put(join(refs, 'stack-guidelines.md'), stack);
  put(claudeMd, `# App\n\n${claudeSection}\n## Other\n\nText.\n`);
  if (rules)
    for (const [name, body] of Object.entries(rules))
      put(join(root, '.claude', 'rules', name), body);
  for (const [name, body] of Object.entries(copies)) put(join(refs, 'rules', name), body);
  return { refs, claudeMd, root };
};

/** @type {(args: string[]) => { status: number | null, out: string }} */
const run = (args) => {
  const { status, stdout, stderr } = spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
  });
  return { status, out: stdout + stderr };
};

describe('check-guidelines', () => {
  it('passes when section and rule files are in sync', () => {
    const { refs, claudeMd } = setup();
    assert.equal(run([refs, claudeMd]).status, 0);
  });

  it('ignores CRLF and trailing whitespace in rule files', () => {
    const { refs, claudeMd } = setup({ copies: { 'a.md': '# A\r\n\r\n' } });
    assert.equal(run([refs, claudeMd]).status, 0);
  });

  it('fails naming a rule file that differs', () => {
    const { refs, claudeMd } = setup({ copies: { 'a.md': '# Changed\n' } });
    const { status, out } = run([refs, claudeMd]);
    assert.equal(status, 1);
    assert.match(out, /rules\/a\.md/);
    assert.match(out, /bash tools\/sync-references\.sh/);
  });

  it('fails when a rule file is missing from references/rules', () => {
    const { refs, claudeMd } = setup({ copies: {} });
    const { status, out } = run([refs, claudeMd]);
    assert.equal(status, 1);
    assert.match(out, /rules\/a\.md: missing/);
  });

  it('fails on a file in references/rules the project no longer has', () => {
    const { refs, claudeMd } = setup({
      copies: { 'a.md': '# A\n', 'old.md': 'x\n' },
    });
    const { status, out } = run([refs, claudeMd]);
    assert.equal(status, 1);
    assert.match(out, /rules\/old\.md/);
  });

  it('fails when the project has no .claude/rules', () => {
    const { refs, claudeMd } = setup({ rules: null });
    const { status, out } = run([refs, claudeMd]);
    assert.equal(status, 1);
    assert.match(out, /no \.claude\/rules/);
  });

  it('--write copies new and changed files, deletes stale ones, then passes', () => {
    const { refs, claudeMd } = setup({
      rules: { 'a.md': '# A2\n', 'b.md': '# B\n' },
      copies: { 'a.md': '# A\n', 'old.md': 'x\n' },
    });
    rmSync(join(refs, 'rules', 'a.md'), { force: false });
    put(join(refs, 'rules', 'a.md'), '# A\n');
    const written = run(['--write', refs, claudeMd]);
    assert.equal(written.status, 0);
    assert.match(written.out, /rules\/a\.md/);
    assert.match(written.out, /rules\/b\.md/);
    assert.match(written.out, /rules\/old\.md/);
    assert.equal(readFileSync(join(refs, 'rules', 'a.md'), 'utf8'), '# A2\n');
    assert.equal(readFileSync(join(refs, 'rules', 'b.md'), 'utf8'), '# B\n');
    assert.equal(existsSync(join(refs, 'rules', 'old.md')), false);
    assert.equal(run([refs, claudeMd]).status, 0);
  });

  it('--write creates references/rules when absent', () => {
    const { refs, claudeMd } = setup({ copies: {} });
    assert.equal(run(['--write', refs, claudeMd]).status, 0);
    assert.equal(existsSync(join(refs, 'rules', 'a.md')), true);
  });

  it('still fails when the CLAUDE.md section differs', () => {
    const { refs, claudeMd } = setup({
      claudeSection: '## Library versions\n\n- react 18\n',
    });
    const { status, out } = run([refs, claudeMd]);
    assert.equal(status, 1);
    assert.match(out, /stack-guidelines\.md/);
  });
});

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../check-contract.mjs', import.meta.url));
const skills = fileURLToPath(new URL('../../skills/', import.meta.url));
const root = mkdtempSync(join(tmpdir(), 'check-contract-'));

after(() => rmSync(root, { recursive: true, force: true }));

const check = (path, cwd) => {
  const { status, stdout, stderr } = spawnSync(process.execPath, [script, path], {
    encoding: 'utf8',
    cwd,
  });

  return { status, stderr, result: stdout ? JSON.parse(stdout) : undefined };
};

const statusOf = (result, id) => result.checks.find((c) => c.id === id)?.status;

/** Writes `files` into a fresh docs/<kind>s/<id>/ and returns that folder. */
let count = 0;

const contract = (kind, files) => {
  count += 1;
  const dir = join(root, String(count), 'docs', `${kind}s`, '412');

  mkdirSync(dir, { recursive: true });

  for (const [file, text] of Object.entries(files)) writeFileSync(join(dir, file), text);

  return dir;
};

const sections = (...names) => names.map((name) => `## ${name}\n\nText.\n`).join('\n');

const ticket = {
  'intent.md': `# 412: Search\n\n${sections('Problem', 'Users', 'Outcome', 'Non-goals', 'Source')}`,
  'spec.md': [
    '# 412: spec\n',
    '## Acceptance criteria\n',
    '- [ ] AC-1 Given customers, when I type a name, then the list filters.',
    '- [x] AC-2 Given no match, when I search, then I see an empty state.\n',
    sections('Data', 'API', 'UI states', 'Out of scope', 'Open questions'),
  ].join('\n'),
  'plan.md': [
    '# 412: plan\n',
    '## Tasks\n',
    '- [ ] T1 Query with a search param (AC-1) — depends on: none',
    '- [ ] T2 Empty state (AC-2) — depends on: T1\n',
    sections('Files', 'Tests', 'Gates', 'Risks'),
  ].join('\n'),
};

const incident = {
  'report.md': `# 412: Login down\n\n${sections('Summary', 'Impact', 'Timeline', 'Detection')}\n## Status\n\n**Resolved** at 10:02 UTC.\n`,
  'rca.md': `# 412: rca\n\n${sections('Root cause', 'Trigger', 'Contributing factors', 'Five whys', 'Why it was not caught')}`,
  'actions.md': `# 412: actions\n\n${sections('Fix', 'Prevention', 'Detection')}\n## Follow-ups\n\n- [ ] A1 Alert on 5xx rate — owner: unassigned\n`,
};

// What `pnpm check:report` prints at the end, for a PR description's Evidence.
const checklistText = [
  '| Gate | Status | Result | Time |',
  '|---|---|---|---|',
  '| Lint | pass | pass | 5s |',
  '| Unit tests | pass | 100% (44/44 passed); line coverage 88.34% | 21s |',
  '',
  'All 2 gates pass.',
  '',
  'CI: pending',
].join('\n');

const pr = (ticketText, evidence = checklistText) =>
  `## Why\n\nText.\n\n## Changes\n\n- Text.\n\n## Ticket\n\n${ticketText}\n\n## Evidence\n\n${evidence}\n`;

/** A project folder holding ticket 412's contract (`files`; undefined skips one) and a PR description. */
const project = (body, files = ticket) => {
  count += 1;
  const cwd = join(root, String(count));
  const dir = join(cwd, 'docs', 'tickets', '412');

  mkdirSync(dir, { recursive: true });

  for (const [name, text] of Object.entries(files)) if (text !== undefined) writeFileSync(join(dir, name), text);

  const file = join(cwd, 'pr-body.md');

  writeFileSync(file, body);

  return { cwd, file };
};

describe('check-contract.mjs', () => {
  it('passes a complete ticket contract', () => {
    const { status, result } = check(contract('ticket', ticket));

    assert.equal(status, 0, JSON.stringify(result));
    assert.equal(result.kind, 'ticket');
    assert.ok(result.checks.every((c) => c.status === 'pass'));
  });

  it('fails a missing file and a missing section, naming them', () => {
    const { status, result } = check(
      contract('ticket', {
        'intent.md': ticket['intent.md'].replace('## Non-goals', '## Later'),
        'spec.md': ticket['spec.md'],
      }),
    );

    assert.equal(status, 1);
    assert.match(result.checks.find((c) => c.id === 'intent.md').detail, /Non-goals/);
    assert.equal(result.checks.find((c) => c.id === 'plan.md').detail, 'missing');
  });

  it('fails a fill marker left from the template', () => {
    const { status, result } = check(
      contract('ticket', { ...ticket, 'spec.md': `${ticket['spec.md']}\n<!-- fill: x -->\n` }),
    );

    assert.equal(status, 1);
    assert.equal(statusOf(result, 'spec.md'), 'fail');
  });

  it('fails a criterion that no task cites', () => {
    const { status, result } = check(
      contract('ticket', { ...ticket, 'plan.md': ticket['plan.md'].replace('(AC-2)', '') }),
    );

    assert.equal(status, 1);
    assert.match(result.checks.find((c) => c.id === 'traceability').detail, /AC-2/);
  });

  it('fails a criterion that only the Tests section names', () => {
    const { status, result } = check(
      contract('ticket', {
        ...ticket,
        'plan.md': `${ticket['plan.md'].replace('(AC-2)', '')}\n## Notes\n\nAC-2 is pinned in a test.\n`,
      }),
    );

    assert.equal(status, 1);
    assert.match(result.checks.find((c) => c.id === 'traceability').detail, /AC-2/);
  });

  it('fails a spec with no criteria and a plan with no tasks', () => {
    const { status, result } = check(
      contract('ticket', {
        ...ticket,
        'spec.md': ticket['spec.md'].replaceAll('AC-', 'C'),
        'plan.md': ticket['plan.md'].replaceAll('- [ ] T', '- T'),
      }),
    );

    assert.equal(status, 1);
    assert.equal(statusOf(result, 'criteria'), 'fail');
    assert.equal(statusOf(result, 'tasks'), 'fail');
  });

  it('passes a complete incident record and reads its status', () => {
    const { status, result } = check(contract('incident', incident));

    assert.equal(status, 0, JSON.stringify(result));
    assert.equal(result.kind, 'incident');
    assert.equal(result.checks.find((c) => c.id === 'status').detail, 'resolved');
  });

  it('fails an incident with no status word and no follow-ups', () => {
    const { status, result } = check(
      contract('incident', {
        ...incident,
        'report.md': incident['report.md'].replace('**Resolved**', 'Fixed'),
        'actions.md': incident['actions.md'].replace('- [ ] A1', '- A1'),
      }),
    );

    assert.equal(status, 1);
    assert.equal(statusOf(result, 'status'), 'fail');
    assert.equal(statusOf(result, 'follow-ups'), 'fail');
  });

  it('finds the kind from the files when the folder is elsewhere', () => {
    const dir = join(root, 'loose');

    mkdirSync(dir);

    for (const [file, text] of Object.entries(incident)) writeFileSync(join(dir, file), text);

    assert.equal(check(dir).result.kind, 'incident');
  });

  it('holds the shipped templates to every section, failing only on their fill markers', () => {
    for (const [kind, files] of [
      ['ticket', ['intent.md', 'spec.md', 'plan.md']],
      ['incident', ['report.md', 'rca.md', 'actions.md']],
    ]) {
      const dir = contract(kind, {});

      for (const file of files) copyFileSync(join(skills, kind, 'references', file), join(dir, file));

      const { status, result } = check(dir);

      assert.equal(status, 1);

      for (const file of files) {
        const { detail } = result.checks.find((c) => c.id === file);

        assert.doesNotMatch(detail, /missing/, `${kind}/${file}: ${detail}`);
        assert.match(detail, /fill/);
      }

      // The examples inside the templates' comments are not criteria, tasks or follow-ups.
      for (const id of kind === 'ticket' ? ['criteria', 'tasks'] : ['status', 'follow-ups']) {
        assert.equal(statusOf(result, id), 'fail', `${kind} ${id}`);
      }
    }
  });

  it('passes a PR description that links a passing ticket contract and its criteria', () => {
    const { cwd, file } = project(
      pr('[412](https://github.com/o/r/blob/feat/412-search/docs/tickets/412/): `AC-1`, `AC-2`'),
    );
    const { status, result } = check(file, cwd);

    assert.equal(status, 0, JSON.stringify(result));
    assert.equal(result.kind, 'pr');
    assert.match(result.checks.find((c) => c.id === 'evidence').detail, /All 2 gates pass/);
  });

  it('passes a PR with no ticket that says why, and fails one that says nothing', () => {
    const none = project(pr('none: a dependency bump, no ticket'));
    const silent = project(pr('See the commits.'));

    assert.equal(check(none.file, none.cwd).status, 0);

    const { status, result } = check(silent.file, silent.cwd);

    assert.equal(status, 1);
    assert.equal(statusOf(result, 'ticket'), 'fail');
  });

  it('fails a PR that links a missing contract, a failing one, or a criterion its spec lacks', () => {
    for (const [body, files, reason] of [
      [pr('docs/tickets/999/'), ticket, /999: no folder/],
      [pr('docs/tickets/412/: `AC-1`'), { ...ticket, 'plan.md': undefined }, /412: its contract fails plan\.md/],
      [pr('docs/tickets/412/: `AC-9`'), ticket, /list no AC-9/],
    ]) {
      const { cwd, file } = project(body, files);
      const { status, result } = check(file, cwd);

      assert.equal(status, 1);
      assert.match(result.checks.find((c) => c.id === 'ticket').detail, reason);
    }
  });

  it('reads the checklist pasted with its own `## Check report` heading', () => {
    const { cwd, file } = project(pr('none: a chore', `## Check report\n\n${checklistText}`));

    assert.equal(check(file, cwd).status, 0);
  });

  it('fails PR evidence with a failing gate or with no checklist', () => {
    for (const [evidence, reason] of [
      [checklistText.replace('| Lint | pass | pass |', '| Lint | FAIL | FAIL |'), /failing gates: Lint/],
      ['Tests pass on my machine.', /no pnpm check:report checklist/],
    ]) {
      const { cwd, file } = project(pr('none: a chore', evidence));
      const { status, result } = check(file, cwd);

      assert.equal(status, 1);
      assert.match(result.checks.find((c) => c.id === 'evidence').detail, reason);
    }
  });

  it('holds the shipped PR template to every section, failing only on its fill markers', () => {
    const { cwd, file } = project('');

    copyFileSync(join(skills, 'pr', 'references', 'pr.md'), file);

    const { status, result } = check(file, cwd);
    const { detail } = result.checks.find((c) => c.id === 'pr-body.md');

    assert.equal(status, 1);
    assert.doesNotMatch(detail, /missing/);
    assert.match(detail, /fill/);
    assert.equal(statusOf(result, 'evidence'), 'fail');
  });

  it('exits 2 for a path that does not exist or holds no contract', () => {
    assert.equal(check(join(root, 'nope')).status, 2);

    const empty = join(root, 'empty');

    mkdirSync(empty);
    assert.equal(check(empty).status, 2);
  });
});

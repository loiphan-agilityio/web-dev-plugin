#!/usr/bin/env node
// Checks a ticket or incident contract folder against the shape the ticket and incident skills
// write, and prints JSON: { kind, dir, checks: [{ id, status, detail }] }.
//
//   node check-contract.mjs <dir>
//
// docs/tickets/<id>/ holds intent.md, spec.md and plan.md; docs/incidents/<id>/ holds report.md,
// rca.md and actions.md. The kind comes from the parent folder's name (tickets, incidents), else
// from the files present. Checks: each file exists, has its required `## ` sections and no
// `<!-- fill` marker left from the template; a ticket's spec lists acceptance criteria
// (`- [ ] AC-1 ...`) and its plan lists tasks (`- [ ] T1 ...`) that cite every criterion; an
// incident's report states its status and its actions list follow-ups (`- [ ] A1 ...`).
// Exit 0 when every check passes, 1 when one fails, 2 when it cannot run.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const contracts = {
  ticket: {
    'intent.md': ['Problem', 'Users', 'Outcome', 'Non-goals', 'Source'],
    'spec.md': ['Acceptance criteria', 'Data', 'API', 'UI states', 'Out of scope', 'Open questions'],
    'plan.md': ['Tasks', 'Files', 'Tests', 'Gates', 'Risks'],
  },
  incident: {
    'report.md': ['Summary', 'Impact', 'Timeline', 'Detection', 'Status'],
    'rca.md': ['Root cause', 'Trigger', 'Contributing factors', 'Five whys', 'Why it was not caught'],
    'actions.md': ['Fix', 'Prevention', 'Detection', 'Follow-ups'],
  },
};

const fail = (message) => {
  console.error(`check-contract: ${message}`);
  process.exit(2);
};

if (process.argv.length !== 3) fail('usage: node check-contract.mjs <dir>');

const dir = resolve(process.argv[2]);

if (!existsSync(dir)) fail(`${dir} does not exist`);

if (!statSync(dir).isDirectory()) fail(`${dir} is not a folder`);

const parent = basename(dirname(dir));

const kind =
  parent === 'tickets' || parent === 'incidents'
    ? parent.slice(0, -1)
    : Object.keys(contracts).find((name) =>
        Object.keys(contracts[name]).some((file) => existsSync(join(dir, file))),
      );

if (!kind) {
  fail(`${dir} is neither under docs/tickets/ or docs/incidents/ nor holds a contract file`);
}

const checks = [];
const add = (id, ok, detail) => checks.push({ id, status: ok ? 'pass' : 'fail', detail });
const texts = {};

for (const [file, sections] of Object.entries(contracts[kind])) {
  const path = join(dir, file);

  if (!existsSync(path)) {
    add(file, false, 'missing');
    continue;
  }

  const raw = readFileSync(path, 'utf8');
  const unfilled = (raw.match(/<!-- fill/g) ?? []).length;
  // What a comment holds is not part of the contract: the templates' examples (`- [ ] AC-1 ...`)
  // sit inside their fill comments.
  const text = raw.replace(/<!--[\s\S]*?-->/g, '');
  const headings = new Set([...text.matchAll(/^## +(.+?)\s*$/gm)].map((match) => match[1]));
  const missing = sections.filter((section) => !headings.has(section));

  texts[file] = text;
  add(
    file,
    missing.length === 0 && unfilled === 0,
    [
      missing.length > 0 && `missing sections: ${missing.join(', ')}`,
      unfilled > 0 && `${unfilled} <!-- fill --> marker(s) left from the template`,
    ]
      .filter(Boolean)
      .join('; ') || 'every section present and filled',
  );
}

/** The ids of the checklist items `- [ ] <prefix><n>` (or `- [x]`) in a text. */
const items = (text, prefix) =>
  [...(text ?? '').matchAll(new RegExp(`^- \\[[ xX]\\] (${prefix}\\d+)\\b`, 'gm'))].map(
    (match) => match[1],
  );

if (kind === 'ticket') {
  const criteria = items(texts['spec.md'], 'AC-');
  const tasks = items(texts['plan.md'], 'T');
  // A criterion counts as planned only when a task line cites it, not the Tests section alone.
  const taskLines = (texts['plan.md'] ?? '').match(/^- \[[ xX]\] T\d+\b.*$/gm)?.join('\n') ?? '';
  const uncited = criteria.filter((id) => !new RegExp(`\\b${id}\\b`).test(taskLines));

  add(
    'criteria',
    criteria.length > 0,
    criteria.length > 0
      ? `${criteria.length} acceptance criteria`
      : 'spec.md lists no `- [ ] AC-1 ...` criterion',
  );
  add('tasks', tasks.length > 0, tasks.length > 0 ? `${tasks.length} tasks` : 'plan.md lists no `- [ ] T1 ...` task');
  add(
    'traceability',
    criteria.length > 0 && uncited.length === 0,
    uncited.length > 0
      ? `plan.md cites no task for ${uncited.join(', ')}`
      : 'every criterion is cited by a task in plan.md',
  );
} else {
  const status = /^## +Status\s*$\s*^\**(open|mitigated|resolved)\b/im.exec(texts['report.md'] ?? '');
  const followUps = items(texts['actions.md'], 'A');

  add(
    'status',
    status !== null,
    status ? status[1].toLowerCase() : 'the Status section starts with neither open, mitigated nor resolved',
  );
  add(
    'follow-ups',
    followUps.length > 0,
    followUps.length > 0
      ? `${followUps.length} follow-ups`
      : 'actions.md lists no `- [ ] A1 ...` follow-up',
  );
}

console.log(JSON.stringify({ kind, dir, checks }, null, 2));
process.exitCode = checks.every((check) => check.status === 'pass') ? 0 : 1;

#!/usr/bin/env node
// Checks a ticket or incident contract folder, or a PR description, against the shape the ticket,
// incident and pr skills write, and prints JSON: { kind, dir | file, checks: [{ id, status, detail }] }.
//
//   node check-contract.mjs <dir>        a ticket or incident folder
//   node check-contract.mjs <file.md>    a PR or MR description, run from the project root
//
// docs/tickets/<id>/ holds intent.md, spec.md and plan.md; docs/incidents/<id>/ holds report.md,
// rca.md and actions.md. The kind comes from the parent folder's name (tickets, incidents), else
// from the files present. Checks: each file exists, has its required `## ` sections and no
// `<!-- fill` marker left from the template; a ticket's spec lists acceptance criteria
// (`- [ ] AC-1 ...`) and its plan lists tasks (`- [ ] T1 ...`) that cite every criterion; an
// incident's report states its status and its actions list follow-ups (`- [ ] A1 ...`).
// A PR description has Why, Changes, Ticket and Evidence: its Ticket links ticket contracts
// (docs/tickets/<id>/, resolved from the current folder) that pass their own checks and list the
// criteria it cites, or says `none: <why>`; its Evidence holds the pnpm check:report checklist
// with every gate passing.
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

const prSections = ['Why', 'Changes', 'Ticket', 'Evidence'];

const fail = (message) => {
  console.error(`check-contract: ${message}`);
  process.exit(2);
};

/** A check list and its `add`: one { id, status, detail } per check. */
const checklist = () => {
  const checks = [];

  return { checks, add: (id, ok, detail) => checks.push({ id, status: ok ? 'pass' : 'fail', detail }) };
};

/** Checks one file's sections and fill markers; returns its text without comments, or undefined. */
const checkFile = (path, id, sections, add) => {
  if (!existsSync(path)) {
    add(id, false, 'missing');
    return undefined;
  }

  const raw = readFileSync(path, 'utf8');
  const unfilled = (raw.match(/<!-- fill/g) ?? []).length;
  // What a comment holds is not part of the contract: the templates' examples (`- [ ] AC-1 ...`)
  // sit inside their fill comments.
  const text = raw.replace(/<!--[\s\S]*?-->/g, '');
  const headings = new Set([...text.matchAll(/^## +(.+?)\s*$/gm)].map((match) => match[1]));
  const missing = sections.filter((section) => !headings.has(section));

  add(
    id,
    missing.length === 0 && unfilled === 0,
    [
      missing.length > 0 && `missing sections: ${missing.join(', ')}`,
      unfilled > 0 && `${unfilled} <!-- fill --> marker(s) left from the template`,
    ]
      .filter(Boolean)
      .join('; ') || 'every section present and filled',
  );

  return text;
};

/** The ids of the checklist items `- [ ] <prefix><n>` (or `- [x]`) in a text. */
const items = (text, prefix) =>
  [...(text ?? '').matchAll(new RegExp(`^- \\[[ xX]\\] (${prefix}\\d+)\\b`, 'gm'))].map(
    (match) => match[1],
  );

/**
 * The text under a PR description's `## <heading>`, up to its next section: pasted output keeps
 * its own headings (`## Check report` above the checklist).
 */
const section = (text, heading) =>
  new RegExp(`^## +${heading}\\s*$([\\s\\S]*?)(?=^## +(?:${prSections.join('|')})\\s*$|(?![\\s\\S]))`, 'm').exec(
    text ?? '',
  )?.[1] ?? '';

/** Checks a ticket or incident folder; returns its checks and the criteria its spec lists. */
const checkFolder = (dir, kind) => {
  const { checks, add } = checklist();
  const texts = {};

  for (const [file, sections] of Object.entries(contracts[kind])) {
    texts[file] = checkFile(join(dir, file), file, sections, add);
  }

  const criteria = items(texts['spec.md'], 'AC-');

  if (kind === 'ticket') {
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

  return { checks, criteria };
};

/** Checks a PR or MR description: its sections, the ticket contracts it links, its evidence. */
const checkPr = (file) => {
  const { checks, add } = checklist();
  const text = checkFile(file, basename(file), prSections, add);
  const ticket = section(text, 'Ticket');
  const ids = [...new Set([...ticket.matchAll(/docs\/tickets\/([^/\s)`'"\]]+)/g)].map((match) => match[1]))];

  if (ids.length === 0) {
    const none = /^\s*`?none:\s*\S/im.test(ticket);

    add(
      'ticket',
      none,
      none ? 'none: no ticket, and the description says why' : 'links no docs/tickets/<id>/ contract and says no `none: <why>`',
    );
  } else {
    const problems = [];
    const listed = new Set();

    for (const id of ids) {
      const dir = resolve('docs', 'tickets', id);

      if (!existsSync(dir)) {
        problems.push(`${id}: no folder docs/tickets/${id}/ here`);
        continue;
      }

      const result = checkFolder(dir, 'ticket');
      const failed = result.checks.filter((check) => check.status === 'fail').map((check) => check.id);

      if (failed.length > 0) problems.push(`${id}: its contract fails ${failed.join(', ')}`);

      for (const criterion of result.criteria) listed.add(criterion);
    }

    const unknown = [...new Set(ticket.match(/\bAC-\d+\b/g) ?? [])].filter((id) => !listed.has(id));

    if (unknown.length > 0) problems.push(`the linked specs list no ${unknown.join(', ')}`);

    add('ticket', problems.length === 0, problems.join('; ') || `${ids.join(', ')}: contract passes`);
  }

  const evidence = section(text, 'Evidence');
  const table = /^\|\s*Gate\s*\|\s*Status\s*\|/im.test(evidence);
  const failing = [...evidence.matchAll(/^\|([^|\n]+)\|\s*FAIL\s*\|/gim)].map((match) => match[1].trim());
  const allPass = /\bAll \d+ gates pass\b/.exec(evidence);

  add(
    'evidence',
    table && failing.length === 0 && allPass !== null,
    !table
      ? 'no pnpm check:report checklist (`| Gate | Status | ...` table)'
      : failing.length > 0
        ? `failing gates: ${failing.join(', ')}`
        : (allPass?.[0] ?? 'no `All N gates pass.` line'),
  );

  return checks;
};

if (process.argv.length !== 3) fail('usage: node check-contract.mjs <dir | pr.md>');

const target = resolve(process.argv[2]);

if (!existsSync(target)) fail(`${target} does not exist`);

if (statSync(target).isFile()) {
  const checks = checkPr(target);

  console.log(JSON.stringify({ kind: 'pr', file: target, checks }, null, 2));
  process.exitCode = checks.every((check) => check.status === 'pass') ? 0 : 1;
} else {
  const parent = basename(dirname(target));
  const kind =
    parent === 'tickets' || parent === 'incidents'
      ? parent.slice(0, -1)
      : Object.keys(contracts).find((name) =>
          Object.keys(contracts[name]).some((file) => existsSync(join(target, file))),
        );

  if (!kind) {
    fail(`${target} is neither under docs/tickets/ or docs/incidents/ nor holds a contract file`);
  }

  const { checks } = checkFolder(target, kind);

  console.log(JSON.stringify({ kind, dir: target, checks }, null, 2));
  process.exitCode = checks.every((check) => check.status === 'pass') ? 0 : 1;
}

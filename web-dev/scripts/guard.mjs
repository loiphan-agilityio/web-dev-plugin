#!/usr/bin/env node
// The guardrails skill's PreToolUse hook (hooks/hooks.json): refuses the git commands that rewrite
// history, force-push, delete a remote branch or skip the hooks, and reading or writing secret
// files, before Claude runs them. It reads the hook input as JSON on stdin; a refusal exits 2 with
// the reason on stderr, which Claude Code shows to Claude. Anything else exits 0. Commands are
// split as a shell would (quotes, `;`, `&&`, `|`, redirects, `sh -c`), so a quoted commit message
// is not mistaken for a flag. It stops mistakes, not someone set on getting around it: an alias, a
// script file or a recursive `grep -r` still gets through.

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** `.env`, `.env.local`, `.envrc`, `.dev.vars`, `.npmrc`, private keys and certificates. */
export const isSecretFile = (path) => {
  const name = basename(path);

  if (/\.(example|sample|template)$/.test(name)) return false;
  if (/^\.env(rc|\..+)?$/.test(name)) return true;

  return (
    ['.dev.vars', '.npmrc', '.netrc', '.pgpass'].includes(name) ||
    /\.(pem|key|p12|pfx|crt)$/.test(name) ||
    /^id_(rsa|ed25519|ecdsa|dsa)$/.test(name)
  );
};

/**
 * Splits a shell command into segments of words, as the shell would: quotes and backslashes
 * kept together, `;`, `&`, `|`, `&&`, `||` and newlines end a segment, and a redirect operator
 * (`>`, `>>`, `<`, `2>`, `&>`) is its own word.
 */
export const tokenize = (command) => {
  const segments = [];
  let words = [];
  let word = '';
  let quoted = false;
  const endWord = () => {
    if (word || quoted) words.push(word);
    word = '';
    quoted = false;
  };
  const endSegment = () => {
    endWord();
    if (words.length) segments.push(words);
    words = [];
  };

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];

    if (ch === "'") {
      const end = command.indexOf("'", i + 1);
      word += command.slice(i + 1, end < 0 ? undefined : end);
      quoted = true;
      i = end < 0 ? command.length : end;
    } else if (ch === '"') {
      let j = i + 1;
      for (; j < command.length && command[j] !== '"'; j++) {
        if (command[j] === '\\' && j + 1 < command.length) j++;
        word += command[j];
      }
      quoted = true;
      i = j;
    } else if (ch === '\\' && i + 1 < command.length) {
      word += command[++i];
    } else if (/\s/.test(ch) && ch !== '\n') {
      endWord();
    } else if (ch === '\n' || ch === ';' || ch === '|' || (ch === '&' && command[i + 1] !== '>')) {
      endSegment();
      if (command[i + 1] === ch) i++;
    } else if (ch === '>' || ch === '<') {
      if (/^\d$|^&$/.test(word)) word = '';
      endWord();
      let op = ch;
      while (command[i + 1] === '>' || command[i + 1] === '&') op += command[++i];
      words.push(op);
    } else {
      word += ch;
    }
  }
  endSegment();

  return segments;
};

const isRedirect = (w) => /^[<>]/.test(w);
const readers = new Set(['cat', 'less', 'more', 'head', 'tail', 'bat', 'grep', 'egrep', 'rg', 'sed', 'awk', 'source', '.', 'tee', 'base64', 'xxd', 'od', 'strings']);
const copiers = new Set(['cp', 'mv', 'ln', 'install']);
const shells = new Set(['sh', 'bash', 'zsh', 'dash']);

/** Short flags in `-abc` form, or undefined for a long flag or a value. */
const shortFlags = (w) => (/^-[A-Za-z]+$/.test(w) ? w.slice(1) : '');
const hasFlag = (args, long, short) =>
  args.some((a) => long.some((l) => a === l || a.startsWith(`${l}=`)) || (short && shortFlags(a).includes(short)));

const checkGit = (args) => {
  // Global options before the subcommand: -C <dir>, -c <key=value>, --git-dir=..., -p, ...
  let i = 0;
  for (; i < args.length && args[i].startsWith('-'); i++) {
    if (args[i] === '-c' && /^core\.hookspath=/i.test(args[i + 1] ?? '')) return 'setting core.hooksPath skips the hooks: fix what they report instead';
    if (args[i] === '-C' || args[i] === '-c') i++;
  }
  const sub = args[i];
  const rest = args.slice(i + 1);

  if (hasFlag(rest, ['--no-verify'])) return '--no-verify skips the hooks: fix what they report instead';

  switch (sub) {
    case 'commit':
      if (hasFlag(rest, ['--amend'])) return 'git commit --amend rewrites a commit: make a new commit instead';
      if (rest.some((a) => shortFlags(a).includes('n'))) return 'git commit -n skips the hooks: fix what they report instead';
      return undefined;
    case 'reset':
      return hasFlag(rest, ['--hard']) ? 'git reset --hard discards work: use git revert, or let the user run it' : undefined;
    case 'rebase':
      return 'git rebase rewrites history: let the user run it';
    case 'push':
      if (hasFlag(rest, ['--force', '--force-with-lease', '--mirror'], 'f') || rest.some((a) => /^\+/.test(a)))
        return 'a force-push overwrites the remote: let the user run it';
      if (hasFlag(rest, ['--delete', '--prune'], 'd') || rest.some((a) => /^:./.test(a)))
        return 'deleting a remote branch: let the user run it';
      return undefined;
    case 'branch':
      return hasFlag(rest, ['--force'], 'f') || rest.some((a) => /[DMC]/.test(shortFlags(a))) || (hasFlag(rest, ['--delete'], 'd') && hasFlag(rest, ['--force'], 'f'))
        ? 'force-moving, renaming over or deleting a branch: let the user run it'
        : undefined;
    default:
      return undefined;
  }
};

const checkWords = (words, cwd, depth = 0) => {
  const assigns = [];
  let k = 0;
  for (; k < words.length && /^\w+=/.test(words[k]); k++) assigns.push(words[k]);
  const [cmd, ...args] = words.slice(k);

  for (let i = 0; i < words.length; i++) {
    if (isRedirect(words[i]) && words[i + 1] && isSecretFile(words[i + 1]) && (words[i] === '<' || existsSync(resolve(cwd, words[i + 1])))) return `${basename(words[i + 1])} holds secrets: the user reads or edits it`;
  }
  if (!cmd) return undefined;

  if (shells.has(basename(cmd)) && depth < 3) {
    const c = args.findIndex((a) => shortFlags(a).includes('c'));
    if (c >= 0 && args[c + 1]) return checkCommand(args[c + 1], cwd, depth + 1);
  }

  if (basename(cmd) === 'git') {
    if (assigns.some((a) => /^HUSKY=0$/.test(a))) return 'HUSKY=0 skips the hooks: fix what they report instead';
    return checkGit(args);
  }

  if (readers.has(basename(cmd)) && args.some((a) => !a.startsWith('-') && isSecretFile(a))) {
    return 'that file holds secrets: the user reads or edits it';
  }

  // cp .env.example .env.local creates the file; copying from, or over, a secret file does not.
  if (copiers.has(basename(cmd))) {
    const paths = args.filter((a) => !a.startsWith('-'));
    const target = paths.at(-1);
    if (paths.slice(0, -1).some(isSecretFile) || (target && isSecretFile(target) && existsSync(resolve(cwd, target)))) {
      return 'that file holds secrets: the user reads or edits it';
    }
  }

  return undefined;
};

const checkCommand = (command, cwd, depth = 0) => {
  for (const words of tokenize(command)) {
    const reason = checkWords(words, cwd, depth);
    if (reason) return reason;
  }

  return undefined;
};

/**
 * The reason to refuse a tool call, or undefined. Writing a secret file that does not exist yet
 * (project-setup creates `.env.local` from `.env.example`) is allowed; reading, editing or
 * overwriting one is not.
 */
export const check = ({ tool_name: tool, tool_input: input = {}, cwd = process.cwd() }) => {
  const path = input.file_path ?? input.notebook_path ?? (tool === 'Grep' ? input.path : undefined);

  if (typeof path === 'string' && isSecretFile(path) && !(tool === 'Write' && !existsSync(resolve(cwd, path)))) {
    return `${basename(path)} holds secrets: the user reads or edits it`;
  }
  if (tool === 'Bash' && typeof input.command === 'string') return checkCommand(input.command, cwd);

  return undefined;
};

const isMain = () => {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
};

if (process.argv[1] && isMain()) {
  let input;

  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    process.exit(0);
  }

  const reason = check(input);

  if (reason) {
    process.stderr.write(`Blocked by the web-dev guardrails: ${reason}. See the guardrails skill.\n`);
    process.exit(2);
  }
}

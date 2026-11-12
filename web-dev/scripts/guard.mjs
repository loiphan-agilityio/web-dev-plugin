#!/usr/bin/env node
// The guardrails skill's PreToolUse hook (hooks/hooks.json): refuses the git commands that rewrite
// history, discard uncommitted work, force-push, delete a remote branch or skip the hooks, and
// reading or writing secret files, and the release gate (production deploys, tags, merges and
// approvals; see the release skill), before Claude runs them. It reads the hook input as JSON on
// stdin; a refusal exits 2 with the reason on stderr, which Claude Code shows to Claude. Anything
// else exits 0. Commands are split as a shell would (quotes, `;`, `&&`, `|`, redirects, `sh -c`),
// so a quoted commit message is not mistaken for a flag, and `env`, `sudo`, `command`, `nohup`,
// `time` and `exec` in front of a command are looked through. It stops mistakes, not someone set
// on getting around it: an alias, a script file or a recursive `grep -r` still gets through.

import { execFileSync } from 'node:child_process';
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

/** Commands that run the command after them, each with its options that take the next word as their value. */
const wrappers = new Map([
  ['env', ['-u', '--unset', '-C', '--chdir']],
  ['sudo', ['-u', '--user', '-g', '--group', '-h', '--host', '-p', '--prompt', '-C', '--close-from', '-D', '--chdir', '-R', '--chroot', '-T', '--command-timeout', '-U', '--other-user', '-r', '--role', '-t', '--type']],
  ['command', []],
  ['nohup', []],
  ['time', ['-f', '--format', '-o', '--output']],
  ['exec', ['-a']],
]);

/** The words behind any wrappers (`sudo -u x env A=1 git ...` gives `git ...`), and the assignments the wrappers set. */
const unwrap = (words) => {
  const assigns = [];
  let rest = words;

  while (rest.length && wrappers.has(basename(rest[0]))) {
    const valued = wrappers.get(basename(rest[0]));
    let k = 1;
    for (; k < rest.length; k++) {
      if (valued.includes(rest[k]) || valued.includes(`-${shortFlags(rest[k]).at(-1)}`)) k++;
      else if (/^\w+=/.test(rest[k])) assigns.push(rest[k]);
      else if (!rest[k].startsWith('-')) break;
    }
    rest = rest.slice(k);
  }

  return { rest, assigns };
};

/** Search commands, whose first word is the pattern: their short and long options that take a value. */
const searchers = new Map([
  ['grep', { short: 'efABCmdD', long: ['--regexp', '--file', '--after-context', '--before-context', '--context', '--max-count', '--include', '--exclude', '--exclude-from', '--exclude-dir', '--label', '--binary-files', '--devices', '--directories'] }],
  ['rg', { short: 'efABCgtTmMjErd', long: ['--regexp', '--file', '--after-context', '--before-context', '--context', '--glob', '--iglob', '--type', '--type-not', '--type-add', '--max-count', '--max-columns', '--max-depth', '--max-filesize', '--threads', '--encoding', '--replace', '--sort', '--sortr', '--color', '--colors', '--pre', '--pre-glob', '--ignore-file', '--engine', '--context-separator', '--path-separator'] }],
]);
searchers.set('egrep', searchers.get('grep'));

/**
 * The files a search command reads: the words after the pattern (the first word that is not an
 * option or an option's value, unless `-e` or `-f` gave the pattern), and the file `-f` names.
 */
const searchFiles = (cmd, args) => {
  const { short, long } = searchers.get(cmd);
  const files = [];
  let pattern = false;
  let options = true;
  const take = (flag, value) => {
    if (flag === 'e' || flag === 'f') pattern = true;
    if (flag === 'f' && value) files.push(value);
  };

  for (let k = 0; k < args.length; k++) {
    const a = args[k];

    if (isRedirect(a)) k++;
    else if (options && a === '--') options = false;
    else if (options && a.startsWith('--')) {
      const [name, ...value] = a.split('=');
      if (long.includes(name)) take(name === '--regexp' ? 'e' : name === '--file' ? 'f' : name, value.length ? value.join('=') : args[++k]);
    } else if (options && /^-./.test(a)) {
      const at = [...a].findIndex((ch, n) => n > 0 && short.includes(ch));
      if (at > 0) take(a[at], a.slice(at + 1) || args[++k]);
    } else if (pattern) files.push(a);
    else pattern = true;
  }

  return files;
};

/** Short flags in `-abc` form, or undefined for a long flag or a value. */
const shortFlags = (w) => (/^-[A-Za-z]+$/.test(w) ? w.slice(1) : '');
const hasFlag = (args, long, short) =>
  args.some((a) => long.some((l) => a === l || a.startsWith(`${l}=`)) || (short && shortFlags(a).includes(short)));

const protectedBranches = new Set(['main', 'master', 'dev', 'develop', 'stag', 'staging', 'prod', 'production']);

/** Runs git in `cwd`: `{ out, status }`, status 0 on success, -1 when it could not run or timed out. */
const gitRun = (cwd, args, timeout = 3000) => {
  try {
    return { out: execFileSync('git', args, { cwd, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'ignore'] }).trim(), status: 0 };
  } catch (error) {
    return { out: undefined, status: typeof error.status === 'number' ? error.status : -1 };
  }
};
/** Runs git in `cwd`; its trimmed output, or undefined when it fails. */
const git = (cwd, ...args) => gitRun(cwd, args).out;

/** Push options that take the next word as their value. */
const pushValueOptions = new Set(['-o', '--push-option', '--repo', '--receive-pack', '--exec']);

/** The remote's default branch (`<remote>/HEAD`), else whichever of main and master it has. */
const remoteMain = (cwd, remote) => {
  const head = git(cwd, 'rev-parse', '--abbrev-ref', `refs/remotes/${remote}/HEAD`);
  if (head && head !== `refs/remotes/${remote}/HEAD`) return git(cwd, 'rev-parse', '--verify', '--quiet', head);
  for (const name of ['main', 'master']) {
    const sha = git(cwd, 'rev-parse', '--verify', '--quiet', `refs/remotes/${remote}/${name}`);
    if (sha) return sha;
  }
  return undefined;
};

/**
 * The release gate on `git push <remote> <refspec>...`: no push to a protected branch, and a tag
 * only when its commit is already on the remote's main (a merged commit). `--tags` and the like
 * push every tag at once, so a tag goes by name.
 */
const checkPushTargets = (rest, cwd, firstPush) => {
  if (hasFlag(rest, ['--tags', '--follow-tags', '--all'])) return 'push one tag by name, once its commit is merged: not every tag at once';
  const words = [];
  let repo;
  for (let k = 0; k < rest.length; k++) {
    if (pushValueOptions.has(rest[k])) {
      if (rest[k] === '--repo') repo = rest[k + 1];
      k++;
    } else if (rest[k].startsWith('--repo=')) repo = rest[k].slice('--repo='.length);
    else if (!rest[k].startsWith('-')) words.push(rest[k]);
  }
  const [remote = repo ?? 'origin', ...refspecs] = repo ? [repo, ...words] : words;
  const current = git(cwd, 'branch', '--show-current') ?? '';
  const targets = refspecs.length ? refspecs : [current];

  for (let k = 0; k < targets.length; k++) {
    let spec = targets[k];
    if (spec === 'tag' && targets[k + 1]) spec = `refs/tags/${targets[++k]}`;
    const [src, dst = src] = spec.split(':');
    // HEAD and @ are the current branch: `git push origin HEAD` on main pushes main.
    const name = ['HEAD', '@'].includes(dst) ? current : dst.replace(/^refs\/(heads|tags)\//, '');

    // deploy-setup creates main in an empty repository with PROTECTED_BRANCHES=none git push -u
    // origin main: allowed only while the remote has no branch of that name.
    // ls-remote --exit-code exits 2 only when the ref is missing; any other failure (network,
    // auth, timeout) keeps the branch protected.
    const creates = firstPush && gitRun(cwd, ['ls-remote', '--exit-code', '--heads', remote, name], 5000).status === 2;
    if (!dst.startsWith('refs/tags/') && protectedBranches.has(name) && !creates) {
      return `'${name}' changes only through a merged pull request: the merge is a person's decision`;
    }
    const tag = dst.startsWith('refs/tags/') || git(cwd, 'show-ref', '--verify', '--quiet', `refs/tags/${name}`) !== undefined ? name : undefined;
    if (tag) {
      const sha = git(cwd, 'rev-list', '-n', '1', `refs/tags/${src.replace(/^refs\/tags\//, '')}`);
      const main = remoteMain(cwd, remote);
      if (!sha || !main || git(cwd, 'merge-base', '--is-ancestor', sha, main) === undefined) {
        return `tag ${tag} is not on ${remote}'s default branch: tag a merged commit (git fetch ${remote} first)`;
      }
    }
  }

  return undefined;
};

/** `gh` and `glab`: approving or merging a pull or merge request is the user's. */
const checkForge = (cmd, all) => {
  // Global flags before the subcommand: -R/--repo <owner/repo>, --hostname <host>.
  const args = [];
  for (let k = 0; k < all.length; k++) {
    if (args.length === 0 && ['-R', '--repo', '--hostname'].includes(all[k])) k++;
    else if (!(args.length === 0 && /^--(repo|hostname)=/.test(all[k]))) args.push(all[k]);
  }
  const [group, action] = args;
  const merge = 'approving or merging a pull or merge request is a person\'s decision';

  if (cmd === 'gh' && group === 'pr' && (action === 'merge' || (action === 'review' && hasFlag(args, ['--approve'], 'a')))) return merge;
  if (cmd === 'glab' && group === 'mr' && (action === 'merge' || action === 'approve')) return merge;
  if (cmd === 'gh' && group === 'api' && args.some((a) => /\/pulls\/\d+\/merge$|event=APPROVE|mergePullRequest|enablePullRequestAutoMerge|addPullRequestReview[\s\S]*APPROVE/.test(a))) return merge;
  if (cmd === 'glab' && group === 'api' && args.some((a) => /merge_requests\/\d+\/(merge|approve)/.test(a))) return merge;

  return undefined;
};

/** wrangler, direct or through npx, pnpm dlx/exec, bunx or yarn: production deploys come from CI. */
const checkWrangler = (args) => {
  const [group, action, ...rest] = args;
  if (group !== 'pages') return undefined;
  if (action === 'deployment' && rest[0] === 'delete') return 'deleting a Pages deployment cannot be undone: let the user do it';
  if (action !== 'deploy' && !(action === 'deployment' && rest[0] === 'create')) return undefined;

  const i = args.findIndex((a) => a === '--branch' || a.startsWith('--branch='));
  const branch = i < 0 ? undefined : args[i].includes('=') ? args[i].split('=')[1] : args[i + 1];
  if (!branch) return 'name a preview branch with --branch: without it Pages may treat the deploy as production';
  if (protectedBranches.has(branch)) return `--branch ${branch} deploys to production: production deploys only from CI, after the pull request is merged`;

  return undefined;
};

/** Checkout options that take the next word as their value: the new branch's name, a merge style. */
const checkoutValueOptions = new Set(['-b', '-B', '--orphan', '--conflict', '--pathspec-from-file']);

/**
 * Whether `git checkout` overwrites files instead of switching: a pathspec after `--`, a path
 * after the branch, or one word that names no commit and exists as a path. A name that is both a
 * branch and a path is the branch, as git reads it.
 */
const checkoutPath = (rest, cwd) => {
  const dashes = rest.indexOf('--');
  if (dashes >= 0) return dashes < rest.length - 1;

  const words = [];
  for (let k = 0; k < rest.length; k++) {
    if (checkoutValueOptions.has(rest[k])) return false;
    if (!rest[k].startsWith('-')) words.push(rest[k]);
  }
  if (words.length > 1) return true;
  if (words.length === 0 || git(cwd, 'rev-parse', '--verify', '--quiet', `${words[0]}^{commit}`) !== undefined) return false;

  return existsSync(resolve(cwd, words[0]));
};

const checkGit = (args, base, firstPush = false) => {
  // Global options before the subcommand: -C <dir>, -c <key=value>, --git-dir=..., -p, ...
  let cwd = base;
  let i = 0;
  for (; i < args.length && args[i].startsWith('-'); i++) {
    if (args[i] === '-C' && args[i + 1]) cwd = resolve(cwd, args[i + 1]);
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
      // --abort and --continue cancel or finish a rebase the user started.
      return rest.length === 1 && ['--abort', '--continue'].includes(rest[0]) ? undefined : 'git rebase rewrites history: let the user run it';
    case 'clean':
      return hasFlag(rest, ['--force'], 'f') && !hasFlag(rest, ['--dry-run'], 'n') ? 'git clean -f deletes untracked files: let the user run it' : undefined;
    case 'checkout':
      if (hasFlag(rest, ['--force'], 'f')) return 'git checkout -f discards uncommitted changes: let the user run it';
      return checkoutPath(rest, cwd) ? 'git checkout of a path discards uncommitted changes: let the user run it' : undefined;
    case 'switch':
      return hasFlag(rest, ['--discard-changes', '--force'], 'f') ? 'git switch --discard-changes discards uncommitted changes: let the user run it' : undefined;
    case 'stash':
      return ['drop', 'clear'].includes(rest[0]) ? `git stash ${rest[0]} deletes stashed work: let the user run it` : undefined;
    case 'restore':
      // --staged alone only unstages; anything else writes the working tree.
      return hasFlag(rest, ['--staged'], 'S') && !hasFlag(rest, ['--worktree'], 'W') ? undefined : 'git restore discards uncommitted changes: let the user run it';
    case 'push':
      if (hasFlag(rest, ['--force', '--force-with-lease', '--mirror'], 'f') || rest.some((a) => /^\+/.test(a)))
        return 'a force-push overwrites the remote: let the user run it';
      if (hasFlag(rest, ['--delete', '--prune'], 'd') || rest.some((a) => /^:./.test(a)))
        return 'deleting a remote branch: let the user run it';
      return checkPushTargets(rest, cwd, firstPush);
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
  const wrapped = unwrap(words.slice(k));
  const [cmd, ...args] = wrapped.rest;

  for (let i = 0; i < words.length; i++) {
    if (isRedirect(words[i]) && words[i + 1] && isSecretFile(words[i + 1]) && (words[i] === '<' || existsSync(resolve(cwd, words[i + 1])))) return `${basename(words[i + 1])} holds secrets: the user reads or edits it`;
  }
  if (!cmd) return undefined;

  if (shells.has(basename(cmd)) && depth < 3) {
    const c = args.findIndex((a) => shortFlags(a).includes('c'));
    if (c >= 0 && args[c + 1]) return checkCommand(args[c + 1], cwd, depth + 1);
  }

  if (basename(cmd) === 'git') {
    if ([...assigns, ...wrapped.assigns].some((a) => /^HUSKY=0$/.test(a))) return 'HUSKY=0 skips the hooks: fix what they report instead';
    // The first-push exception holds only for the assignment right in front of git, not through a wrapper.
    return checkGit(args, cwd, wrapped.rest.length === words.length - k && assigns.includes('PROTECTED_BRANCHES=none'));
  }

  if (cmd === 'gh' || cmd === 'glab') return checkForge(cmd, args);

  if (basename(cmd) === 'wrangler') return checkWrangler(args);
  if (['npx', 'npm', 'pnpm', 'bunx', 'yarn'].includes(basename(cmd))) {
    const w = args.findIndex((a) => /^wrangler(@|$)/.test(a));
    if (w >= 0) return checkWrangler(args.slice(w + 1));
  }

  const read = searchers.has(basename(cmd)) ? searchFiles(basename(cmd), args) : args.filter((a) => !a.startsWith('-'));
  if (readers.has(basename(cmd)) && read.some(isSecretFile)) {
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

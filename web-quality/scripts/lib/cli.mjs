// The command-line plumbing the measurement scripts share: when a module runs as the script, how a
// report is printed, and how a script that cannot measure stops. Node's standard library only.
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** @typedef {{ id: string, status: 'pass' | 'fail' | 'warn' | 'info', detail: string }} Check */

/**
 * Whether the module at `moduleUrl` (its import.meta.url) runs as the script, not imported by a
 * test. Node resolves the module's real path, so argv[1] is compared by its real path too: through
 * a symlink or junction the two spellings differ.
 * @param {string} moduleUrl
 */
export const isMain = (moduleUrl) => {
  try {
    return moduleUrl === pathToFileURL(realpathSync(process.argv[1] ?? '')).href;
  } catch {
    return false;
  }
};

/**
 * Prints a report as JSON, with how many of its checks have each status.
 * @param {{ checks: Check[] }} report
 */
export const printReport = (report) => {
  const count = (/** @type {string} */ status) =>
    report.checks.filter((check) => check.status === status).length;
  const summary = { pass: count('pass'), fail: count('fail'), warn: count('warn'), info: count('info') };
  console.log(JSON.stringify({ ...report, summary }, null, 2));
};

/**
 * Stops a script that could not measure: the cause on stderr, nothing on stdout, exit 2.
 * @param {string} prefix the script's name, and what it measured when that helps
 * @param {unknown} cause
 * @param {string} [hint] a line to add, such as the usage
 * @returns {never}
 */
export const cannotRun = (prefix, cause, hint) => {
  console.error(`${prefix}: ${cause instanceof Error ? cause.message : cause}`);
  if (hint) console.error(hint);
  process.exit(2);
};

// A helper the scripts' tests share; not a test file itself (the runners match *.test.mjs).

/**
 * Each check's status by its id, to assert a report in one comparison.
 * @type {(report: { checks: import('../lib/cli.mjs').Check[] }) => Record<string, string>}
 */
export const statuses = (report) => Object.fromEntries(report.checks.map((check) => [check.id, check.status]));

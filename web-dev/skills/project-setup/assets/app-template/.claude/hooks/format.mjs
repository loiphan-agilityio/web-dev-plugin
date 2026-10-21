// PostToolUse hook (.claude/settings.json): runs Prettier on the file Claude just wrote or edited,
// as lint-staged does at commit time. .prettierignore still applies (Markdown, .claude,
// components/ui). Files outside the project are left alone, and a failure never blocks the edit:
// `pnpm lint` still gates.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isAbsolute, relative } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const file = JSON.parse(readFileSync(0, 'utf8')).tool_input?.file_path;
const rel = typeof file === 'string' ? relative(root, file) : '..';
if (!rel.startsWith('..') && !isAbsolute(rel)) {
  spawnSync(
    process.execPath,
    ['node_modules/prettier/bin/prettier.cjs', '--write', '--ignore-unknown', file],
    { cwd: root },
  );
}

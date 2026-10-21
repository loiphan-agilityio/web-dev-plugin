// Checks run on staged files before each commit (husky pre-commit). Files inside the template are
// checked by the template's own lint-staged config (the nearest config wins), with the ESLint and
// Prettier that this package's postinstall installs there.
export default {
  '*.sh': 'shellcheck',
  '*.mjs': (files) => files.map((file) => `node --check ${file}`),
};

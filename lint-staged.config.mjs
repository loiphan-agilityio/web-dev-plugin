// Checks run on staged files before each commit (husky pre-commit).
export default {
  '*.sh': 'shellcheck',
  '*.mjs': (files) => files.map((file) => `node --check ${file}`),
};

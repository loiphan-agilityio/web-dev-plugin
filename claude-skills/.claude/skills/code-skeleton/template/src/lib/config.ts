/**
 * Every environment value the app reads, in one place.
 *
 * Vite inlines `import.meta.env.VITE_*` at build time: the values end up as plain text in
 * `dist/`, so never put a secret in one. Access them statically — `import.meta.env[name]` is
 * not replaced and is `undefined` in the build.
 */
export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? '/api',
  apiMocking: import.meta.env.VITE_API_MOCKING === 'true',
} as const;

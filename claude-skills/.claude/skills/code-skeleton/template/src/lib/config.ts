import { Schema } from 'effect';

/**
 * Every environment value the app reads, in one place, validated at startup.
 *
 * Vite inlines `import.meta.env.VITE_*` at build time: the values end up as plain text in
 * `dist/`, so never put a secret in one. Access them statically — `import.meta.env[name]` is
 * not replaced and is `undefined` in the build.
 */
const Env = Schema.Struct({
  VITE_API_URL: Schema.optional(Schema.String),
  VITE_API_MOCKING: Schema.optional(Schema.Literals(['true', 'false'])),
});

/** Throws a SchemaError naming the bad variable, so a misconfigured app fails at startup. */
export const parseConfig = (raw: unknown) => {
  const env = Schema.decodeUnknownSync(Env)(raw);
  return {
    apiUrl: env.VITE_API_URL ?? '/api',
    apiMocking: env.VITE_API_MOCKING === 'true',
  } as const;
};

export const config = parseConfig({
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_API_MOCKING: import.meta.env.VITE_API_MOCKING,
});

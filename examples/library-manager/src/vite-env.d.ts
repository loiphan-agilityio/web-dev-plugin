// The `VITE_*` values the app reads (src/lib/config.ts). `vite/client` (tsconfig `types`) merges
// this into `import.meta.env`.
interface ImportMetaEnv {
  /** Base URL of the backend API, e.g. `https://api.example.com`. Defaults to `/api`. */
  readonly VITE_API_URL?: string;
  /** `true` to serve API responses from the MSW handlers in `src/mocks` (`pnpm dev:mock`). */
  readonly VITE_API_MOCKING?: string;
}

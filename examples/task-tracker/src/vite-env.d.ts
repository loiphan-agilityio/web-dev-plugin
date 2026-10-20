/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend API, e.g. `https://api.example.com`. Defaults to `/api`. */
  readonly VITE_API_URL?: string;
  /** `true` to serve API responses from the MSW handlers in `src/mocks` during `pnpm dev`. */
  readonly VITE_API_MOCKING?: string;
  /** `true` for the demo build: MSW answers in-page (no service worker) and routing is in memory. */
  readonly VITE_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

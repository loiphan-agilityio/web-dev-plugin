import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { configDefaults } from 'vitest/config';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Reads the `@/*` alias from tsconfig, so the alias is declared once.
  resolve: { tsconfigPaths: true },
  // The backend sends no CORS headers, so the browser talks to this origin and Vite forwards /api.
  server: { proxy: { '/api': 'http://localhost:3000' } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // .claude holds Claude Code skills, whose templates and examples contain their own tests.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});

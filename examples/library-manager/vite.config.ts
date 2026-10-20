import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Reads the `@/*` alias from tsconfig, so the alias is declared once.
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/features/**', 'src/lib/**'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.stories.tsx'],
      thresholds: { lines: 80 },
    },
    // .claude holds Claude Code skills, whose templates and examples contain their own tests.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});

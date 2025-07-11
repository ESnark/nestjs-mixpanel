import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'src/index.ts',
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'coverage/**',
        'dist/**',
        'node_modules/**',
        '*.config.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  },
});
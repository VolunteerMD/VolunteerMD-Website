import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: './tests/setup.js',
    include: ['tests/**/*.spec.js'],
    threads: false
  }
});

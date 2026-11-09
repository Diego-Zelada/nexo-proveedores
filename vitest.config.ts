import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'api/test/**/*.test.ts', 'functions/test/**/*.test.ts'],
    environment: 'node',
  },
})

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_PATH: ':memory:',
      TZ: 'Asia/Jakarta',
    },
    testTimeout: 20_000,
  },
})

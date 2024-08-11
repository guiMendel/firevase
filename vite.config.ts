/// <reference types="vitest" />
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { configDefaults, coverageConfigDefaults } from 'vitest/config'

const testExclude = ['**/tests/**', '**/index.ts']

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    exclude: [...configDefaults.exclude, ...testExclude],
    coverage: {
      exclude: [...coverageConfigDefaults.exclude, ...testExclude],
    },
  },
})

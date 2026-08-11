import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import fs from 'node:fs'

// Fails a production build if the gitignored legal.*.local.json overrides
// are missing, so Impressum/Datenschutz can't ship with [PLACEHOLDER] text.
function requireLegalOverrides() {
  return {
    name: 'require-legal-overrides',
    apply: 'build',
    buildStart() {
      const dir = path.resolve(import.meta.dirname, 'src/i18n')
      for (const lng of ['en', 'de']) {
        const file = path.join(dir, `legal.${lng}.local.json`)
        if (!fs.existsSync(file)) {
          this.error(
            `Missing src/i18n/legal.${lng}.local.json — add your real legal ` +
              `details before building for production (see src/i18n/legal.${lng}.json for the template).`
          )
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), requireLegalOverrides()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
})

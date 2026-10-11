import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

// The CSP in nginx.conf allows the inline theme script in index.html by hash.
// Editing that script without updating the hash would silently block it.
describe('Content-Security-Policy', () => {
  it('allows every inline script in index.html by its sha256 hash', () => {
    const html = read('index.html')
    const nginx = read('nginx.conf')
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
    expect(scripts.length).toBeGreaterThan(0)
    for (const body of scripts) {
      const hash = createHash('sha256').update(body).digest('base64')
      expect(nginx).toContain(`'sha256-${hash}'`)
    }
  })
})

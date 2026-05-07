// Web Worker: decrypts the Vespa export and returns a normalized payload.
import { decryptVespaExport } from './decrypt'
import { buildImportPayload } from './normalize'

self.onmessage = async (e) => {
  const { id, fileText } = e.data
  try {
    self.postMessage({ id, stage: 'decrypting' })
    const decrypted = decryptVespaExport(fileText)
    self.postMessage({ id, stage: 'parsing' })
    const payload = buildImportPayload(decrypted)
    self.postMessage({ id, stage: 'done', payload })
  } catch (err) {
    self.postMessage({ id, stage: 'error', error: err?.message ?? String(err) })
  }
}

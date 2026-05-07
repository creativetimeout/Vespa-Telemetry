import { Blowfish } from 'egoroof-blowfish'

function base64ToBytes(b64) {
  const bin = atob(b64.replace(/\s+/g, ''))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function base64ToString(b64) {
  const bytes = base64ToBytes(b64)
  return new TextDecoder('utf-8').decode(bytes)
}

export function decryptVespaExport(fileText) {
  // The export file is base64-encoded. Decode it to get JSON.
  const wrapperJson = base64ToString(fileText.trim())
  const wrapper = JSON.parse(wrapperJson)
  const { header, payload } = wrapper
  if (!header?.userId || typeof payload !== 'string') {
    throw new Error('Unexpected file shape: expected { header.userId, payload }')
  }
  const cipherBytes = base64ToBytes(payload)
  const bf = new Blowfish(header.userId, Blowfish.MODE.ECB, Blowfish.PADDING.PKCS5)
  const plaintext = bf.decode(cipherBytes, Blowfish.TYPE.STRING)
  return { header, data: JSON.parse(plaintext) }
}

// Compress a base64 JPEG to a smaller base64 JPEG via canvas.
// Target: ~256 px wide, quality 0.7. Returns null if input can't be decoded.

export async function compressJpegBase64(b64, { maxWidth = 256, quality = 0.7 } = {}) {
  if (!b64) return null
  try {
    const dataUrl = `data:image/jpeg;base64,${b64}`
    const blob = await (await fetch(dataUrl)).blob()
    const bitmap = await createImageBitmap(blob)
    const scale = Math.min(1, maxWidth / bitmap.width)
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    const out = await new Promise((res) =>
      canvas.toBlob(res, 'image/jpeg', quality)
    )
    if (!out) return null
    const buf = new Uint8Array(await out.arrayBuffer())
    let bin = ''
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i])
    return btoa(bin)
  } catch (err) {
    console.warn('Image compression failed', err)
    return null
  }
}

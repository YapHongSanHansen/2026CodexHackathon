export function imageDimensions(buffer: Buffer, mime: string): { width: number; height: number } | null {
  if (mime === 'image/png' && buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  if ((mime === 'image/jpeg' || buffer[0] === 0xff) && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2
    while (offset + 8 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset++; continue }
      const marker = buffer[offset + 1]
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) }
      const length = buffer.readUInt16BE(offset + 2)
      if (length < 2) break
      offset += 2 + length
    }
  }
  if (mime === 'image/webp' && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' && buffer.toString('ascii', 12, 16) === 'VP8X' && buffer.length >= 30) return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) }
  return null
}
export function validateLandscape(width: number, height: number): string | null {
  return width < 1280 || height < 720 || width <= height ? `Detected ${width}×${height}. Photos must be landscape and at least 1280×720.` : null
}

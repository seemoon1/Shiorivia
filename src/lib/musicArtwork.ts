import { open, stat } from "node:fs/promises";
import { extname } from "node:path";

export type ExtractedCover = { data: Buffer; extension: ".jpg" | ".png" };
const MAX_READ = 8 * 1024 * 1024;
const MAX_ART = 2 * 1024 * 1024;

function picture(bytes: Buffer): ExtractedCover | null {
  if (!bytes.length || bytes.length > MAX_ART) return null;
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { data: bytes, extension: ".jpg" };
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return { data: bytes, extension: ".png" };
  return null;
}

function synchsafe(bytes: Buffer, pos: number): number {
  return ((bytes[pos] & 0x7f) << 21) | ((bytes[pos + 1] & 0x7f) << 14) | ((bytes[pos + 2] & 0x7f) << 7) | (bytes[pos + 3] & 0x7f);
}

function id3Cover(bytes: Buffer): ExtractedCover | null {
  if (bytes.length < 20 || bytes.toString("latin1", 0, 3) !== "ID3") return null;
  const version = bytes[3];
  if (version !== 3 && version !== 4) return null;
  const end = Math.min(bytes.length, 10 + synchsafe(bytes, 6));
  let offset = 10;
  while (offset + 10 <= end) {
    const id = bytes.toString("latin1", offset, offset + 4);
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const length = version === 4 ? synchsafe(bytes, offset + 4) : bytes.readUInt32BE(offset + 4);
    const frameStart = offset + 10;
    if (!length || frameStart + length > end) break;
    if (id === "APIC") {
      const payload = bytes.subarray(frameStart, frameStart + length);
      const mimeEnd = payload.indexOf(0, 1);
      if (mimeEnd > 0 && mimeEnd + 2 < payload.length) {
        const encoding = payload[0];
        let pos = mimeEnd + 2; // MIME terminator + picture type.
        if (encoding === 1 || encoding === 2) {
          // UTF-16 descriptions use a two-byte terminator.
          while (pos + 1 < payload.length && !(payload[pos] === 0 && payload[pos + 1] === 0)) pos += 2;
          pos += 2;
        } else {
          const endDescription = payload.indexOf(0, pos);
          pos = endDescription < 0 ? payload.length : endDescription + 1;
        }
        const result = picture(payload.subarray(pos));
        if (result) return result;
      }
    }
    offset = frameStart + length;
  }
  return null;
}

function flacCover(bytes: Buffer): ExtractedCover | null {
  if (bytes.toString("latin1", 0, 4) !== "fLaC") return null;
  let at = 4;
  while (at + 4 <= bytes.length) {
    const type = bytes[at] & 0x7f;
    const isLast = Boolean(bytes[at] & 0x80);
    const size = bytes.readUIntBE(at + 1, 3);
    at += 4;
    if (at + size > bytes.length) break;
    if (type === 6) {
      const p = bytes.subarray(at, at + size);
      // Picture type(4), MIME length(4), MIME, description length(4), description,
      // width/height/depth/colors(16), data length(4), image bytes.
      if (p.length >= 32) {
        let offset = 4;
        const mimeLength = p.readUInt32BE(offset); offset += 4 + mimeLength;
        if (offset + 4 <= p.length) {
          const descriptionLength = p.readUInt32BE(offset); offset += 4 + descriptionLength + 16;
          if (offset + 4 <= p.length) {
            const dataLength = p.readUInt32BE(offset); offset += 4;
            if (dataLength && offset + dataLength <= p.length) {
              const result = picture(p.subarray(offset, offset + dataLength));
              if (result) return result;
            }
          }
        }
      }
    }
    at += size;
    if (isLast) break;
  }
  return null;
}

function m4aCover(bytes: Buffer): ExtractedCover | null {
  // Apple 'covr' metadata atom contains one or more 'data' atoms.
  // Verify magic bytes rather than trusting the declared image MIME.
  for (let at = bytes.indexOf("covr", 4); at >= 4 && at + 24 < bytes.length; at = bytes.indexOf("covr", at + 4)) {
    const size = bytes.readUInt32BE(at - 4);
    if (size < 24 || size > MAX_READ || at - 4 + size > bytes.length) continue;
    const end = at - 4 + size;
    for (let child = at + 4; child + 16 <= end;) {
      const length = bytes.readUInt32BE(child);
      if (length < 16 || child + length > end) break;
      if (bytes.toString("latin1", child + 4, child + 8) === "data") {
        const result = picture(bytes.subarray(child + 16, child + length));
        if (result) return result;
      }
      child += length;
    }
  }
  return null;
}

/** Best-effort, bounded extraction. Unsupported/invalid tags deliberately yield a plain vinyl label. */
export async function extractMusicArtwork(file: string): Promise<ExtractedCover | null> {
  const extension = extname(file).toLowerCase();
  if (![".mp3", ".flac", ".m4a"].includes(extension)) return null;
  try {
    const size = Math.min((await stat(file)).size, MAX_READ);
    if (!size) return null;
    const handle = await open(file, "r");
    const bytes = Buffer.alloc(size);
    try {
      const { bytesRead } = await handle.read(bytes, 0, size, 0);
      const data = bytes.subarray(0, bytesRead);
      return extension === ".mp3" ? id3Cover(data) : extension === ".flac" ? flacCover(data) : m4aCover(data);
    } finally { await handle.close(); }
  } catch { return null; }
}

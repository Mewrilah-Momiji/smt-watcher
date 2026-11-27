import { Buffer } from 'buffer';
import { decompressRTF } from '@kenjiuno/decompressrtf';
import iconv from 'iconv-lite';
import { deEncapsulateSync } from 'rtf-stream-parser';

// The RTF parser uses a global Buffer, which browsers do not have.
globalThis.Buffer ??= Buffer;

// The HTML of an ordinary email compresses to far less. Decompressing can grow the data about eightfold, and it runs
// without a break, so a larger body would hold up the page.
const MAX_COMPRESSED_BYTES = 4 * 1024 * 1024;

/** Outlook often stores HTML only inside compressed RTF. Returns null if it holds no HTML. */
export function htmlFromCompressedRtf(compressed: Uint8Array): string | null {
  if (compressed.length < 16 || compressed.length > MAX_COMPRESSED_BYTES) return null;
  // The decompressor reads as far as this size says, past the end of the data, and fills memory with zeros on the
  // way. It counts the bytes after the size field itself.
  const size = new DataView(compressed.buffer, compressed.byteOffset, compressed.byteLength).getUint32(0, true);
  if (size < 12 || size + 4 > compressed.length) return null;
  try {
    const rtf = Buffer.from(decompressRTF(Array.from(compressed)));
    const result = deEncapsulateSync(rtf, { decode: iconv.decode, mode: 'html' });
    return typeof result.text === 'string' ? result.text : result.text.toString('utf8');
  } catch {
    return null;
  }
}

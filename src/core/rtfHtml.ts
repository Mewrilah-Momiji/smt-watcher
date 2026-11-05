import { Buffer } from 'buffer';
import { decompressRTF } from '@kenjiuno/decompressrtf';
import iconv from 'iconv-lite';
import { deEncapsulateSync } from 'rtf-stream-parser';

// The RTF parser uses a global Buffer, which browsers do not have.
globalThis.Buffer ??= Buffer;

/** Outlook often stores HTML only inside compressed RTF. Returns null if it holds no HTML. */
export function htmlFromCompressedRtf(compressed: Uint8Array): string | null {
  try {
    const rtf = Buffer.from(decompressRTF(Array.from(compressed)));
    const result = deEncapsulateSync(rtf, { decode: iconv.decode, mode: 'html' });
    return typeof result.text === 'string' ? result.text : result.text.toString('utf8');
  } catch {
    return null;
  }
}

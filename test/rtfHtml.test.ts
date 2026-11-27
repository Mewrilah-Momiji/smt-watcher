import { describe, expect, it } from 'vitest';
import { htmlFromCompressedRtf } from '../src/core/rtfHtml';

const COMPRESSED = 0x75465a4c;

function header(size: number, length = 16): Uint8Array {
  const data = new Uint8Array(length);
  const view = new DataView(data.buffer);
  view.setUint32(0, size, true);
  view.setUint32(4, 100, true);
  view.setUint32(8, COMPRESSED, true);
  return data;
}

describe('compressed RTF', () => {
  it('gives up at once on a size beyond the data', () => {
    const started = performance.now();
    expect(htmlFromCompressedRtf(header(0x7fffffff))).toBeNull();
    expect(htmlFromCompressedRtf(header(1000, 64))).toBeNull();
    expect(performance.now() - started).toBeLessThan(100);
  });

  it('rejects data that is too short or too large', () => {
    expect(htmlFromCompressedRtf(new Uint8Array(8))).toBeNull();
    expect(htmlFromCompressedRtf(header(4 * 1024 * 1024, 4 * 1024 * 1024 + 4))).toBeNull();
  });
});

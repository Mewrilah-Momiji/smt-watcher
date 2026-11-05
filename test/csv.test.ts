import { describe, expect, it } from 'vitest';
import { buildCsv } from '../src/core/csv';

describe('buildCsv', () => {
  it('separates cells and quotes where needed', () => {
    expect(buildCsv([['a', 'b;c', 'd"e', 'f\ng']])).toBe('﻿a;"b;c";"d""e";"f\ng"\r\n');
  });

  it.each(['=1+1', '+49 171', '-2', '@SUM(A1)', '\tx'])('keeps %j from running as a formula', (value) => {
    expect(buildCsv([[value]]).replace('﻿', '').trim().replace(/^"|"$/g, '').startsWith("'")).toBe(true);
  });
});

/** A spreadsheet would run a cell starting like this as a formula, and senders and subjects come from attackers. */
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Semicolons and a byte order mark, as Excel in Germany expects them. */
export function buildCsv(rows: string[][]): string {
  return `﻿${rows.map((row) => row.map(cell).join(';')).join('\r\n')}\r\n`;
}

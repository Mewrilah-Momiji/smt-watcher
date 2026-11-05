import { mailFiles } from './mailFolder';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MissingHeadersError, readMail } from '../src/core/readMail';

const folder = join(import.meta.dirname, '..', 'SpamMails');

// Runs locally only and prints nothing but counts, never email content.
describe.skipIf(!existsSync(folder))('real emails from SpamMails', () => {
  it('can be analyzed', async () => {
    const counts = {
      total: 0,
      analyzed: 0,
      withoutHeaders: 0,
      errors: 0,
      withFrom: 0,
      withSubject: 0,
      withDate: 0,
      withReturnPath: 0,
      withReceived: 0,
      withReceivedIp: 0,
    };

    for (const name of mailFiles(folder)) {
      const file = readFileSync(join(folder, name));
      counts.total++;
      try {
        const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
        const report = await readMail(name, data);
        counts.analyzed++;
        if (report.from) counts.withFrom++;
        if (report.subject) counts.withSubject++;
        if (report.date) counts.withDate++;
        if (report.returnPath) counts.withReturnPath++;
        if (report.received.length > 0) counts.withReceived++;
        if (report.received.some((hop) => hop.ip)) counts.withReceivedIp++;
      } catch (cause) {
        if (cause instanceof MissingHeadersError) counts.withoutHeaders++;
        else counts.errors++;
      }
    }

    console.log(JSON.stringify(counts));
    expect(counts.errors).toBe(0);
  });
});

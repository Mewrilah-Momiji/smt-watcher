import { mailFiles } from './mailFolder';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assess } from '../src/core/assessment';
import { baseDomain } from '../src/core/findings';
import { buildAbuseReport } from '../src/core/reporting';
import { msgToEml } from '../src/core/msgToEml';
import { findSenderOrigin } from '../src/core/senderOrigin';
import { findPhoneCandidates } from '../src/core/phones';
import { MissingHeadersError, readMail } from '../src/core/readMail';

const root = join(import.meta.dirname, '..');

// Runs locally only and prints nothing but counts, never email content.
describe.each(['SpamMails', 'LegitimeMails'])('checks on real emails from %s', (folderName) => {
  const folder = join(root, folderName);

  it.skipIf(!existsSync(folder))('produce results', async () => {
    const tally = (map: Record<string, number>, key: string) => {
      map[key] = (map[key] ?? 0) + 1;
    };
    const auth: Record<string, number> = {};
    const findings: Record<string, number> = {};
    const phoneStats: Record<string, number> = {};
    const levels: Record<string, number> = {};
    const originStats: Record<string, number> = {};
    const conversion: Record<string, number> = {};
    const findingsByGroup: Record<string, number> = {};
    const mails = { total: 0, analyzed: 0, withoutHeaders: 0, errors: 0, withWarning: 0, withNoteOnly: 0, withoutFindings: 0, withSignals: 0 };
    const knownResults = new Set(['pass', 'fail', 'softfail', 'none', 'neutral', 'temperror', 'permerror', 'bestguesspass', 'hardfail']);

    for (const name of mailFiles(folder)) {
      const file = readFileSync(join(folder, name));
      mails.total++;
      try {
        const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
        const report = await readMail(name, data);
        mails.analyzed++;
        if (report.providerSignals.length > 0) mails.withSignals++;
        const phones = report.bodyText ? findPhoneCandidates(report.bodyText) : [];
        const assessment = assess(report.findings);
        // Spam files at or above this hash value were read while writing rules. The rest stays unread.
        const group = createHash('sha256').update(file).digest()[0] % 10 < 3 ? 'held' : 'read';
        tally(levels, `${group}:${assessment.level}`);
        if (assessment.phishingSigns) tally(levels, `${group}:phishingSigns`);
        for (const entry of report.findings) tally(findingsByGroup, `${group}:${entry.code}`);
        try {
          const converted = msgToEml(data);
          const eml = converted.eml.buffer.slice(converted.eml.byteOffset, converted.eml.byteOffset + converted.eml.byteLength) as ArrayBuffer;
          const back = await readMail('converted.eml', eml);
          tally(conversion, 'converted');
          if (converted.skippedAttachments > 0) tally(conversion, 'withSkippedAttachments');
          if (eml.byteLength > 2 * 1024 * 1024) tally(conversion, 'over2Mb');
          const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
          if (same(report.from, back.from)) tally(conversion, 'sameFrom');
          if (same(report.date, back.date) && same(report.messageId, back.messageId)) tally(conversion, 'sameDateAndId');
          if (same(report.received, back.received)) tally(conversion, 'sameReceived');
          if (same(report.authentication, back.authentication)) tally(conversion, 'sameAuthentication');
          if ((report.subject ?? '').trim() === (back.subject ?? '').trim()) tally(conversion, 'sameSubject');
          if ((report.bodyText ?? '').replace(/\s+/g, ' ').trim() === (back.bodyText ?? '').replace(/\s+/g, ' ').trim()) tally(conversion, 'sameText');
          if (same(report.hasHtml, back.hasHtml)) tally(conversion, 'sameHasHtml');
          if (same(report.findings.map((f) => f.code).sort(), back.findings.map((f) => f.code).sort())) tally(conversion, 'sameFindings');
          if (back.rawHeaders.includes('X-Converted-From: msg')) tally(conversion, 'marked');
        } catch {
          tally(conversion, 'failed');
        }
        const origin = findSenderOrigin(report.received);
        tally(originStats, origin ? 'found' : 'notFound');
        if (origin) {
          const receiver = baseDomain(report.received.at(-1)!.by!);
          if (origin.claimedName && baseDomain(origin.claimedName) === receiver) tally(originStats, 'probablyInternal');
          if (report.received.length === 1) tally(originStats, 'singleHop');
          const abuse = buildAbuseReport(report, origin).body.toLowerCase();
          if (report.recipientAddresses.some((address) => abuse.includes(address.toLowerCase()))) tally(originStats, 'addressLeak');
          if (report.recipientAddresses.length === 0) tally(originStats, 'noRecipientFound');
        }
        if (report.hasHtml) tally(phoneStats, 'withHtml');
        if (!report.bodyText) tally(phoneStats, 'noBodyText');
        if (phones.length > 0) tally(phoneStats, 'anyCandidate');
        if (phones.some((phone) => phone.hasContext)) tally(phoneStats, 'withContext');
        if (phones.length >= 5) tally(phoneStats, 'fiveOrMore');
        for (const method of ['spf', 'dkim', 'dmarc'] as const) {
          const entry = report.authentication[method];
          tally(auth, `${method}:${entry ? (knownResults.has(entry.result) ? entry.result : 'other') : 'no-result'}`);
        }
        for (const finding of report.findings) tally(findings, finding.code);
        if (report.findings.some((finding) => finding.severity === 'warning')) mails.withWarning++;
        else if (report.findings.length > 0) mails.withNoteOnly++;
        else mails.withoutFindings++;
      } catch (cause) {
        if (cause instanceof MissingHeadersError) mails.withoutHeaders++;
        else mails.errors++;
      }
    }

    console.log(JSON.stringify({ folderName, mails, auth, findings, phoneStats, levels, originStats, conversion, findingsByGroup }));
    expect(mails.errors).toBe(0);
  }, 300_000);
});

describe('real email folders', () => {
  const spam = join(root, 'SpamMails');
  const legitimate = join(root, 'LegitimeMails');

  it.skipIf(!existsSync(spam) || !existsSync(legitimate))('are counted for overlap', () => {
    const hashes = (folder: string) =>
      new Set(mailFiles(folder).map((name) => createHash('sha256').update(readFileSync(join(folder, name))).digest('hex')));
    const spamHashes = hashes(spam);
    const overlap = [...hashes(legitimate)].filter((hash) => spamHashes.has(hash)).length;
    console.log(JSON.stringify({ identicalFilesInBothFolders: overlap }));
  });
});

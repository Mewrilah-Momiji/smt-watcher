import { describe, expect, it } from 'vitest';
import { buildReport, parseReceived } from '../src/core/headers';
import { buildAbuseReport } from '../src/core/reporting';
import { findRecipientAddresses, findSenderOrigin, isPublicIp, redactHeaderBlock, redactRecipients } from '../src/core/senderOrigin';

const hop = (from: string, ip: string | null, by: string) => ({ from, ip, by, date: 'Sun, 01 Nov 2026 10:00:02 +0100' });

describe('parseReceived', () => {
  it('reads the IP from the "from" part only', () => {
    expect(parseReceived('from a.example by b.example [192.0.2.1]; Sun, 01 Nov 2026 10:00:02 +0100').ip).toBeNull();
  });

  it('reads IPs in parentheses and IPv6 addresses', () => {
    expect(parseReceived('from a.example (198.51.100.7) by b.example').ip).toBe('198.51.100.7');
    expect(parseReceived('from a.example (2001:db8::1) by b.example').ip).toBe('2001:db8::1');
    expect(parseReceived('from a.example ([IPv6:2001:db8::2]) by b.example').ip).toBe('2001:db8::2');
  });
});

describe('isPublicIp', () => {
  it.each(['10.0.0.1', '127.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.0.1', '100.64.0.1', '::1', 'fd00::1', 'fe80::1', 'not-an-ip'])('rejects %s', (ip) => {
    expect(isPublicIp(ip)).toBe(false);
  });

  it.each(['198.51.100.7', '172.32.0.1', '2001:db8::1'])('accepts %s', (ip) => {
    expect(isPublicIp(ip)).toBe(true);
  });
});

describe('findSenderOrigin', () => {
  it('uses the outermost server of the receiving provider', () => {
    const origin = findSenderOrigin([
      hop('forged.example', '203.0.113.9', 'relay.spam.example'),
      hop('relay.spam.example', '198.51.100.7', 'mx.provider.example'),
      hop('mx.provider.example', '192.0.2.1', 'store.provider.example'),
    ]);
    expect(origin?.ip).toBe('198.51.100.7');
    expect(origin?.claimedName).toBe('relay.spam.example');
  });

  it('skips internal addresses', () => {
    const origin = findSenderOrigin([
      hop('sender.example', '198.51.100.7', 'mx.provider.example'),
      hop('mx.provider.example', '10.0.0.5', 'store.provider.example'),
    ]);
    expect(origin?.ip).toBe('198.51.100.7');
  });

  it('never trusts older entries from other domains', () => {
    expect(
      findSenderOrigin([
        hop('forged.example', '203.0.113.9', 'relay.spam.example'),
        hop('relay.spam.example', '10.0.0.1', 'mx.provider.example'),
      ]),
    ).toBeNull();
  });

  it('returns nothing without usable data', () => {
    expect(findSenderOrigin([])).toBeNull();
  });
});

const raw = [
  'Received: from mx.provider.example (mx.provider.example [10.0.0.5]) by store.provider.example for <hidden.bcc@provider.example>; Sun, 01 Nov 2026 10:00:05 +0100',
  'Received: from spam.example (spam.example [198.51.100.7]) by mx.provider.example; Sun, 01 Nov 2026 10:00:02 +0100',
  'Delivered-To: Max.Sample@provider.example',
  'From: Sender <offer@spam.example>',
  'To: "Max Sample" <max.sample@provider.example>',
  'Subject: Hello max.sample@provider.example',
].join('\r\n');

describe('recipient addresses', () => {
  it('finds addresses in recipient headers and Received lines', () => {
    const found = findRecipientAddresses([
      { name: 'To', value: 'A <a@x.example>, b@x.example' },
      { name: 'Received', value: 'from a by b for <c@x.example>; date' },
      { name: 'From', value: 'sender@spam.example' },
    ]);
    expect(found).toEqual(['a@x.example', 'b@x.example', 'c@x.example']);
  });

  it('redacts regardless of case and treats addresses literally', () => {
    expect(redactRecipients('To: MAX@X.example, maxax@x-example', ['max@x.example'])).toBe('To: [redacted], maxax@x-example');
  });
});

describe('buildAbuseReport', () => {
  const report = buildReport(raw);
  const origin = findSenderOrigin(report.received)!;
  const email = buildAbuseReport(report, origin);

  it('names the sending IP in UTC', () => {
    expect(origin.ip).toBe('198.51.100.7');
    expect(email.subject).toContain('198.51.100.7');
    expect(email.body).toContain('2026-11-01T09:00:02.000Z');
  });

  it('removes every recipient address, including hidden ones and in the subject', () => {
    expect(email.body.toLowerCase()).not.toContain('max.sample@provider.example');
    expect(email.body).not.toContain('hidden.bcc@provider.example');
    expect(email.body).toContain('[redacted]');
    expect(email.body).toContain('offer@spam.example');
  });

  it('names reported bodies only when told, without duplicates', () => {
    expect(email.body).not.toContain('also reported');
    const reported = buildAbuseReport(report, origin, ['Body A', 'Body B', 'Body A']).body;
    expect(reported).toContain('I have also reported this email to:\n- Body A\n- Body B');
    expect(reported.split('Body A').length).toBe(2);
  });

  it('removes the recipient name and folded recipient lines', () => {
    expect(email.body).not.toContain('Max Sample');
    expect(redactHeaderBlock('To: "Max Sample"\r\n\t<max@x.example>,\r\n\tOther Person <o@x.example>\r\nFrom: a@b.example', [])).toBe(
      'To: [redacted]\nFrom: a@b.example',
    );
  });
});

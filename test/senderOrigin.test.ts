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

describe('origin issues', () => {
  const mail = (received: string, date: string) =>
    buildReport(
      [
        `Received: ${received}`,
        'From: Shop <news@shop.example>',
        'To: me@mine.example',
        'Subject: Hello',
        `Date: ${date}`,
        'Message-ID: <1@shop.example>',
      ].join('\r\n'),
    ).findings.map((finding) => finding.code);

  it('reads the reverse name in front of the IP address', () => {
    expect(parseReceived('from x.example (vm-1.bc.googleusercontent.com. [136.107.220.252]) by mx.mine.example').reverseName).toBe('vm-1.bc.googleusercontent.com');
    expect(parseReceived('from x.example ([136.107.220.252]) by mx.mine.example').reverseName).toBeNull();
    expect(parseReceived('from x.example (unknown [119.10.182.27]) by mx.mine.example').reverseName).toBeNull();
  });

  it('flags a rented cloud server that delivered the email itself', () => {
    const codes = mail('from shop.example (252.220.107.136.bc.googleusercontent.com [136.107.220.252]) by mx.mine.example; Mon, 9 Nov 2026 15:32:51 +0100 (CET)', 'Mon, 09 Nov 2026 14:32:50 +0000');
    expect(codes).toContain('sender-cloud-vm');
    expect(codes).not.toContain('date-in-future');
  });

  it.each(['vmi12345.contaboserver.net', 'ip-51-91-221.eu', 'ns3.ip-51-91-221.eu'])('flags %s', (host) => {
    expect(mail(`from a (${host} [198.51.100.7]) by mx.mine.example; Mon, 9 Nov 2026 15:00:00 +0100`, 'Mon, 9 Nov 2026 15:00:00 +0100')).toContain('sender-cloud-vm');
  });

  it.each(['static.1.2.3.4.clients.your-server.de', 'mail.example.cloudapp.azure.com', 'mail-ej1.googleusercontent.com.evil.example', 'mout.gmx.net'])('leaves %s alone', (host) => {
    expect(mail(`from a (${host} [198.51.100.7]) by mx.mine.example; Mon, 9 Nov 2026 15:00:00 +0100`, 'Mon, 9 Nov 2026 15:00:00 +0100')).not.toContain('sender-cloud-vm');
  });

  it('flags a date more than two hours after delivery', () => {
    const received = 'from a (unknown [119.10.182.27]) by mx.mine.example; Mon,  9 Nov 2026 11:31:36 +0100 (CET)';
    expect(mail(received, 'Mon, 9 Nov 2026 23:12:34 +0600')).toContain('date-in-future');
    expect(mail(received, 'Mon, 9 Nov 2026 13:20:00 +0100')).not.toContain('date-in-future');
    expect(mail(received, 'Mon, 9 Nov 2026 08:00:00 +0100')).not.toContain('date-in-future');
    expect(mail(received, 'not a date')).not.toContain('date-in-future');
  });

  it('trusts no forged entry from before the provider', () => {
    const report = buildReport(
      [
        'Received: from b (relay.example [198.51.100.7]) by mx.mine.example; Mon, 9 Nov 2026 15:00:00 +0100',
        'Received: from a (x.bc.googleusercontent.com [203.0.113.9]) by relay.example; Tue, 10 Nov 2026 15:00:00 +0100',
        'From: news@shop.example',
        'Date: Tue, 10 Nov 2026 15:00:00 +0100',
      ].join('\r\n'),
    );
    const codes = report.findings.map((finding) => finding.code);
    expect(codes).not.toContain('sender-cloud-vm');
    expect(codes).toContain('date-in-future');
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { collectProviderSignals, parseAuthenticationResults, summarizeAuthentication } from '../src/core/auth';
import { baseDomain, findIssues, parseAddress, type FindingInput } from '../src/core/findings';
import { buildReport } from '../src/core/headers';

const none = { spf: null, dkim: null, dmarc: null };
const source = 'authentication-results';
const pass = {
  spf: { method: 'spf', result: 'pass', domain: 'a.example', source },
  dkim: { method: 'dkim', result: 'pass', domain: 'a.example', source },
  dmarc: { method: 'dmarc', result: 'pass', domain: 'a.example', source },
} as FindingInput['authentication'];

function codes(input: Partial<FindingInput>): string[] {
  return findIssues({
    from: 'a@a.example',
    replyTo: null,
    returnPath: null,
    messageId: '<1@a.example>',
    authentication: pass,
    ...input,
  }).map((finding) => finding.code);
}

describe('parseAuthenticationResults', () => {
  it('reads results and ignores comments', () => {
    const parsed = parseAuthenticationResults(
      'mx.example; spf=pass (sender IP is 1.2.3.4; dkim=fail) smtp.mailfrom=bounce@a.example; dkim=pass header.d=b.example; dmarc=fail header.from=c.example',
    );
    expect(parsed.serverId).toBe('mx.example');
    expect(parsed.results.map((entry) => [entry.method, entry.result, entry.domain])).toEqual([
      ['spf', 'pass', 'a.example'],
      ['dkim', 'pass', 'b.example'],
      ['dmarc', 'fail', 'c.example'],
    ]);
  });

  it('handles the Microsoft form without a server ID', () => {
    const parsed = parseAuthenticationResults(
      'spf=softfail (sender IP is 1.2.3.4) smtp.mailfrom=a.example; dkim=none (message not signed) header.d=none;dmarc=none action=none header.from=a.example;compauth=fail reason=601',
    );
    expect(parsed.serverId).toBeNull();
    expect(parsed.results.map((entry) => [entry.method, entry.result, entry.domain])).toEqual([
      ['spf', 'softfail', 'a.example'],
      ['dkim', 'none', null],
      ['dmarc', 'none', 'a.example'],
    ]);
  });
});

describe('summarizeAuthentication', () => {
  const received = { name: 'Received', value: 'from a by b; Sun, 01 Nov 2026 10:00:02 +0100' };

  it('discards entries below the oldest Received', () => {
    const forged = { name: 'Authentication-Results', value: 'x.example; spf=pass' };
    expect(summarizeAuthentication([received, forged]).spf).toBeNull();
  });

  it('uses only the topmost server', () => {
    const summary = summarizeAuthentication([
      { name: 'Authentication-Results', value: 'mx.example; spf=fail' },
      { name: 'Authentication-Results', value: 'other.example; spf=pass; dkim=pass' },
      received,
    ]);
    expect(summary.spf?.result).toBe('fail');
    expect(summary.dkim).toBeNull();
  });

  it('counts one valid DKIM signature out of several as passed', () => {
    const summary = summarizeAuthentication([
      { name: 'Authentication-Results', value: 'mx.example; dkim=fail header.d=a.example; dkim=pass header.d=b.example' },
      received,
    ]);
    expect(summary.dkim?.result).toBe('pass');
    expect(summary.dkim?.domain).toBe('b.example');
  });

  it('fills gaps from Received-SPF', () => {
    const summary = summarizeAuthentication([
      { name: 'Authentication-Results', value: 'mx.example; dkim=pass' },
      { name: 'Received-SPF', value: 'Fail (mx.example: domain does not designate)' },
      received,
    ]);
    expect(summary.spf).toMatchObject({ result: 'fail', source: 'received-spf' });
    expect(summary.dkim).toMatchObject({ result: 'pass', source: 'authentication-results' });
  });

  it('fills gaps from the spam filter without overriding better sources', () => {
    const summary = summarizeAuthentication([
      { name: 'Authentication-Results', value: 'mx.example; dkim=fail' },
      { name: 'X-Spam-Status', value: 'No, score=1.2 required=5.0 tests=DKIM_VALID,SPF_SOFTFAIL, HTML_MESSAGE autolearn=no version=3.4' },
      received,
    ]);
    expect(summary.spf).toMatchObject({ result: 'softfail', source: 'spam-filter' });
    expect(summary.dkim).toMatchObject({ result: 'fail', source: 'authentication-results' });
  });

  it('ignores a forged spam filter header below the oldest Received', () => {
    const forged = { name: 'X-Spam-Status', value: 'No, tests=SPF_PASS,DKIM_VALID' };
    expect(summarizeAuthentication([received, forged])).toEqual(none);
  });
});

describe('collectProviderSignals', () => {
  it('keeps known provider headers unchanged at any position', () => {
    const received = { name: 'Received', value: 'from a by b' };
    expect(
      collectProviderSignals([
        { name: 'X-DMARC-Test', value: 'Softfail' },
        { name: 'X-Other', value: 'ignored' },
        received,
        { name: 'X-SPF-Fail', value: 'Yes' },
      ]),
    ).toEqual([
      { name: 'X-DMARC-Test', value: 'Softfail' },
      { name: 'X-SPF-Fail', value: 'Yes' },
    ]);
  });
});

describe('parseAddress', () => {
  it('finds the address behind a colon in an unquoted name', () => {
    expect(parseAddress('Mail ID : 247 <123@live.example>')).toEqual({ name: 'Mail ID : 247', domain: 'live.example', address: '123@live.example' });
  });

  it('finds no address in an empty group', () => {
    expect(parseAddress('undisclosed-recipients:;')?.domain ?? null).toBeNull();
  });
});

describe('baseDomain', () => {
  it('merges subdomains', () => {
    expect(baseDomain('mail.news.Example.de')).toBe('example.de');
  });

  it('respects two-part endings', () => {
    expect(baseDomain('mail.example.co.uk')).toBe('example.co.uk');
    expect(baseDomain('news.a.co.kr')).toBe('a.co.kr');
    expect(baseDomain('www.a.com.ua')).toBe('a.com.ua');
    expect(baseDomain('e-tax.nta.go.jp')).toBe('nta.go.jp');
  });

  it('follows the Public Suffix List, beyond the endings it used to know', () => {
    expect(baseDomain('edu.hmu.gr')).toBe('hmu.gr');
    expect(baseDomain('mail.iitb.ac.in')).toBe('iitb.ac.in');
    expect(baseDomain('www.example.gov.br')).toBe('example.gov.br');
    expect(baseDomain('a.b.city.example.tokyo.jp')).toBe('example.tokyo.jp');
    expect(baseDomain('example.mi.us')).toBe('example.mi.us');
  });

  it('handles wildcards, exceptions, bare suffixes and punycode', () => {
    expect(baseDomain('shop.anything.ck')).toBe('shop.anything.ck');
    expect(baseDomain('mail.www.ck')).toBe('www.ck');
    expect(baseDomain('co.uk')).toBe('co.uk');
    expect(baseDomain('de')).toBe('de');
    expect(baseDomain('example.xn--fiqs8s')).toBe('example.xn--fiqs8s');
  });

  it('keeps free hosts as one base domain, as their pages belong to anyone', () => {
    expect(baseDomain('login-check.vercel.app')).toBe('vercel.app');
    expect(baseDomain('user.github.io')).toBe('github.io');
  });
});

describe('findIssues', () => {
  it('reports nothing for an unremarkable email', () => {
    expect(codes({ returnPath: '<bounce@news.a.example>', replyTo: 'Team <team@a.example>' })).toEqual([]);
  });

  it('reports differing reply and sending domains', () => {
    expect(codes({ replyTo: 'x@b.example', returnPath: '<x@c.example>' })).toEqual([
      'reply-to-signed-sender',
      'return-path-other-domain',
    ]);
  });

  it('does not treat another domain under a country ending as signed by the sender', () => {
    const signer = { ...pass, dkim: { ...pass.dkim, domain: 'b.co.kr' } } as FindingInput['authentication'];
    expect(codes({ from: 'x@a.co.kr', replyTo: 'x@c.example', authentication: signer })).toEqual(['reply-to-other-domain']);
  });

  it('only eases a differing reply domain if the sender signed and it is no free mail service', () => {
    expect(codes({ replyTo: 'x@b.example' })).toEqual(['reply-to-signed-sender']);
    expect(codes({ replyTo: 'x@gmail.com' })).toEqual(['reply-to-other-domain']);
    const otherSigner = { ...pass, dkim: { ...pass.dkim, domain: 'b.example' } } as FindingInput['authentication'];
    expect(codes({ replyTo: 'x@b.example', authentication: otherSigner })).toEqual(['reply-to-other-domain']);
    const failed = { ...pass, dkim: { ...pass.dkim, result: 'fail' } } as FindingInput['authentication'];
    expect(codes({ replyTo: 'x@b.example', authentication: failed })).toContain('reply-to-other-domain');
  });

  it('accepts a mailing list as Reply-To only if it is the List-Post address and no free mail service', () => {
    const failed = { ...pass, dkim: { ...pass.dkim, result: 'fail' } } as FindingInput['authentication'];
    expect(codes({ replyTo: 'dev@list.example', listPost: 'DEV@list.example', authentication: failed })).not.toContain('reply-to-other-domain');
    expect(codes({ replyTo: 'other@list.example', listPost: 'dev@list.example', authentication: failed })).toContain('reply-to-other-domain');
    expect(codes({ replyTo: 'x@gmail.com', listPost: 'x@gmail.com', authentication: failed })).toContain('reply-to-other-domain');
  });

  it('does not ease a Reply-To elsewhere on a list, even if the sender signed', () => {
    expect(codes({ replyTo: 'x@b.example', listPost: 'group@a.example' })).toEqual(['reply-to-other-domain']);
    expect(codes({ replyTo: 'group@a.example', listPost: 'group@a.example' })).toEqual([]);
  });

  it('ignores an empty Return-Path', () => {
    expect(codes({ returnPath: '<>' })).toEqual([]);
  });

  it('reports missing check results', () => {
    expect(codes({ authentication: none })).toEqual(['no-check-results']);
  });

  it('reports a missing sender and Message-ID', () => {
    expect(codes({ from: null, messageId: null })).toEqual(['sender-missing', 'message-id-missing']);
  });

  it('reports hidden recipients and a missing subject of a mass mailing', () => {
    expect(codes({ to: null, subject: '' })).toEqual(['recipients-hidden', 'subject-missing']);
    expect(codes({ to: 'undisclosed-recipients:;', subject: 'Hi' })).toEqual(['recipients-hidden']);
    expect(codes({ to: '<undisclosed-recipients:>', subject: 'Hi' })).toEqual(['recipients-hidden']);
    expect(codes({ to: 'Team: a@a.example, b@a.example;', subject: 'Hi' })).toEqual([]);
    expect(codes({ to: 'b@b.example', subject: '  ' })).toEqual(['subject-missing']);
  });

  it('leaves recipient and subject alone when the header block was not given', () => {
    expect(codes({})).toEqual([]);
  });
});

describe('recipients and subject in buildReport', () => {
  const head = 'From: a@a.example\r\nMessage-ID: <1@a.example>\r\n';

  it('checks them only in a header block with a delivery route', () => {
    const codesOf = (raw: string) => buildReport(raw).findings.map((finding) => finding.code);
    expect(codesOf(`Received: from x by y; Fri, 6 Nov 2026 04:02:41 +0100\r\n${head}\r\n`)).toEqual(
      expect.arrayContaining(['recipients-hidden', 'subject-missing']),
    );
    expect(codesOf(`${head}\r\n`)).not.toContain('recipients-hidden');
  });
});

describe('buildReport', () => {
  it('detects the spoofed test email and is not fooled by it', () => {
    const raw = readFileSync(new URL('./fixtures/spoofed.eml', import.meta.url), 'latin1');
    const report = buildReport(raw);

    expect(report.authentication.spf?.result).toBe('fail');
    expect(report.authentication.dmarc?.result).toBe('fail');
    expect(report.authentication.dkim?.result).toBe('none');
    expect(report.findings.map((finding) => finding.code)).toEqual([
      'dmarc-failed',
      'spf-failed',
      'display-name-spoof',
      'reply-to-other-domain',
      'return-path-other-domain',
      'message-id-missing',
    ]);
    expect(report.from).toContain('support@savings.example');
  });
});

describe('provider spam verdict', () => {
  const mail = (extra: string) => buildReport(`From: Shop <news@shop.example>\r\nSubject: Offer\r\nMessage-ID: <1@shop.example>\r\n${extra}\r\n`, { subject: 'Offer', bodyText: 'Hello', bodyHtml: null, attachmentNames: [] });

  it('counts a receiving server\'s spam verdict for an email nobody signed', () => {
    expect(mail('X-Spam-Flag: YES').findings.map((f) => f.code)).toContain('provider-spam-verdict');
    expect(mail('X-Spam-Status: Yes, score=8.8 required=5.0').findings.map((f) => f.code)).toContain('provider-spam-verdict');
  });

  it('ignores a verdict of no spam and a verdict on a signed email', () => {
    expect(mail('X-Spam-Status: No, score=0.1').findings.map((f) => f.code)).not.toContain('provider-spam-verdict');
    const signed = mail('X-Spam-Flag: YES\r\nAuthentication-Results: mx.example; dkim=pass header.d=shop.example');
    expect(signed.findings.map((f) => f.code)).not.toContain('provider-spam-verdict');
  });
});

describe('sender domain without an ending', () => {
  const domainCodes = (from: string) => codes({ from });
  it('reports a sender domain that cannot exist', () => {
    expect(domainCodes('Mercado Pago <alerta@mercado-pago475330558>')).toContain('sender-domain-invalid');
    expect(domainCodes('Shop <news@shop.example>')).not.toContain('sender-domain-invalid');
    expect(domainCodes('Admin <root@[192.0.2.1]>')).not.toContain('sender-domain-invalid');
  });
});

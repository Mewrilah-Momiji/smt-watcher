import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildContribution, isWrongAssessment, verdictForWrongAssessment } from '../src/core/contribution';
import { buildReport } from '../src/core/headers';

const raw = readFileSync(new URL('./fixtures/spoofed.eml', import.meta.url), 'latin1').split(/\r?\n\r?\n/)[0];

function report(from: string, to = 'me@private.example') {
  return buildReport(`From: "Secret Name" <info@news.sender.example>\r\nTo: ${to}\r\nSubject: Secret subject\r\nMessage-ID: <1@x.example>\r\nReceived: from a.example ([192.0.2.7]) by mx.example; Mon, 2 Nov 2026 10:00:00 +0100\r\n`.replace('"Secret Name" <info@news.sender.example>', from), {
    subject: 'Secret subject',
    bodyText: 'Hello me@private.example, see https://track.links.example/me%40private.example and https://sender.example/x',
  });
}

describe('buildContribution', () => {
  it('holds only the fields named in the consent text', () => {
    const contribution = buildContribution(report('"Secret Name" <info@news.sender.example>'), 'spam');
    expect(Object.keys(contribution!).sort()).toEqual(['assessmentWrong', 'authentication', 'codes', 'level', 'linkDomains', 'senderDomain', 'signedBySender', 'verdict']);
    expect(contribution!.senderDomain).toBe('sender.example');
    expect(contribution!.linkDomains).toEqual(['links.example', 'sender.example']);
  });

  it('never carries names, addresses, the subject, the text or an IP address', () => {
    const sent = JSON.stringify(buildContribution(report('"Secret Name" <info@news.sender.example>'), 'spam'));
    for (const secret of ['Secret', 'info@', 'news.', 'me@', 'private.example', 'me%40', 'Hello', '192.0.2.7']) {
      expect(sent).not.toContain(secret);
    }
    expect(JSON.stringify(buildContribution(buildReport(raw), 'unsure'))).not.toMatch(/@/);
  });

  it('leaves out link domains that the server would reject', () => {
    const odd = { ...report('a@sender.example'), linkDomains: ['good.example', 'bad_name.example', 'ümlaut.example'] };
    expect(buildContribution(odd, 'spam')!.linkDomains).toEqual(['good.example']);
  });

  it('skips free mail and the recipient\'s own domain', () => {
    expect(buildContribution(report('someone@gmail.com'), 'spam')).toBeNull();
    expect(buildContribution(report('a@mail.private.example'), 'spam')).toBeNull();
    expect(buildContribution(report('not an address'), 'spam')).toBeNull();
  });

  it('leaves the free mail list to the file the build generates', () => {
    const script = readFileSync(new URL('../public/api/report.php', import.meta.url), 'utf8');
    expect(script).not.toMatch(/const FREEMAIL_DOMAINS/);
    expect(script).toContain('FREEMAIL_DOMAINS');
  });

  it('turns a report of a wrong assessment into the opposite verdict', () => {
    expect(verdictForWrongAssessment('many-signs')).toBe('legit');
    expect(verdictForWrongAssessment('some-signs')).toBeNull();
    expect(verdictForWrongAssessment('no-signs')).toBe('spam');
  });

  it('counts a wrong assessment only while the chosen verdict contradicts the level', () => {
    expect(isWrongAssessment('no-signs', 'spam', true)).toBe(true);
    expect(isWrongAssessment('no-signs', 'legit', true)).toBe(false);
    expect(isWrongAssessment('many-signs', 'legit', true)).toBe(true);
    expect(isWrongAssessment('many-signs', 'spam', true)).toBe(false);
    expect(isWrongAssessment('some-signs', 'spam', true)).toBe(true);
    expect(isWrongAssessment('some-signs', 'legit', true)).toBe(true);
    expect(isWrongAssessment('some-signs', 'unsure', true)).toBe(false);
    expect(isWrongAssessment('no-signs', 'spam', false)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { assess } from '../src/core/assessment';
import { buildContribution } from '../src/core/contribution';
import { buildReport } from '../src/core/headers';
import { lookupDomain, lookupFinding } from '../src/core/senderLookup';

const headers = (dkim: string, from = 'info@news.sender.example') =>
  `From: ${from}\r\nMessage-ID: <1@x.example>\r\nAuthentication-Results: mx.example; ${dkim}\r\n`;
const signed = buildReport(headers('dkim=pass header.d=sender.example'));
const unsigned = buildReport(headers('dkim=fail header.d=sender.example'));

describe('lookupDomain', () => {
  it('asks about the base domain, and not about free mail', () => {
    expect(lookupDomain(signed)).toBe('sender.example');
    expect(lookupDomain(buildReport(headers('dkim=pass', 'someone@gmail.com')))).toBeNull();
  });
});

describe('lookupFinding', () => {
  it('only blames a sender as such if its domain signed', () => {
    expect(lookupFinding(signed, 'reported-spam')).toMatchObject({ code: 'db-reported-spam', severity: 'warning' });
    expect(lookupFinding(unsigned, 'reported-spam')).toMatchObject({ code: 'db-reported-unverified', severity: 'note' });
  });

  it('only mentions votes for legitimate if the domain signed', () => {
    expect(lookupFinding(signed, 'reported-legit')?.code).toBe('db-reported-legit');
    expect(lookupFinding(unsigned, 'reported-legit')).toBeNull();
  });

  it('adds nothing without an entry', () => {
    expect(lookupFinding(signed, 'none')).toBeNull();
  });
});

describe('levels with database findings', () => {
  const level = (code: Parameters<typeof assess>[0][number]['code']) => assess([{ code, severity: 'note' }]).level;

  it('lets many spam reports reach "some signs" at most on their own', () => {
    expect(level('db-reported-spam')).toBe('some-signs');
  });

  it('adds no weight for anything else, so that no vote can give an all-clear or a false alarm', () => {
    for (const code of ['db-reported-unverified', 'db-reported-legit', 'db-disputed', 'db-seen-spam'] as const) {
      expect(level(code)).toBe('no-signs');
    }
  });

  it('never lowers a level', () => {
    const risky = [{ code: 'spf-failed', severity: 'warning' }] as const;
    expect(assess([...risky, { code: 'db-reported-legit', severity: 'note' }]).level).toBe(assess([...risky]).level);
  });

  it('does not send its own findings back to the database', () => {
    const withFinding = { ...signed, findings: [...signed.findings, lookupFinding(signed, 'reported-spam')!] };
    expect(buildContribution(withFinding, 'spam')!.codes).not.toContain('db-reported-spam');
  });
});

import { addressParser, decodeWords } from 'postal-mime';
import { EXCEPTION_DOMAINS, SUFFIXES_BY_TLD, WILDCARD_SUFFIXES } from '../data/publicSuffixes';
import type { AuthSummary } from './auth';
import { FREEMAIL_DOMAINS } from './sharedLists';

export type FindingCode =
  | 'dmarc-failed'
  | 'spf-failed'
  | 'spf-softfail'
  | 'dkim-failed'
  | 'no-check-results'
  | 'not-authenticated'
  | 'sender-missing'
  | 'display-name-spoof'
  | 'reply-to-other-domain'
  | 'reply-to-signed-sender'
  | 'db-reported-spam'
  | 'db-reported-unverified'
  | 'db-reported-legit'
  | 'db-disputed'
  | 'db-seen-spam'
  | 'return-path-other-domain'
  | 'message-id-missing'
  | 'recipients-hidden'
  | 'subject-missing'
  | 'crypto-recovery'
  | 'extortion-threat'
  | 'advertorial'
  | 'plain-password'
  | 'reply-to-freemail'
  | 'to-sender-only'
  | 'link-text-mismatch'
  | 'link-text-signed-sender'
  | 'link-ip-host'
  | 'link-punycode'
  | 'link-shortener'
  | 'brand-impersonation'
  | 'credential-request'
  | 'risky-attachment'
  | 'display-name-domain'
  | 'hidden-characters'
  | 'styled-letters'
  | 'garbled-sender-name'
  | 'unfilled-placeholder'
  | 'fake-reply'
  | 'address-in-subject'
  | 'address-greeting'
  | 'recipient-org-in-name'
  | 'mixed-script-words'
  | 'risky-tld'
  | 'role-name-external'
  | 'provider-spam-verdict'
  | 'sender-domain-invalid'
  | 'bulk-sender-address'
  | 'link-public-host'
  | 'foreign-script'
  | 'windfall-promise'
  | 'liquidation-offer'
  | 'gift-shipping-fee'
  | 'hidden-filler-text'
  | 'to-stranger'
  | 'sender-cloud-vm'
  | 'date-in-future';

export interface Finding {
  code: FindingCode;
  severity: 'warning' | 'note';
  /** Values for the text shown to the user. */
  params?: Record<string, string>;
}

/** The script that readers of a page language write in themselves, so a text in it is not foreign to them. */
const OWN_SCRIPT: Partial<Record<string, string>> = { bg: 'cyrillic' };

/** Leaves out the foreign script finding for readers who use that script themselves. */
export function forReader(findings: Finding[], lang: string): Finding[] {
  const own = OWN_SCRIPT[lang];
  return own ? findings.filter((finding) => !(finding.code === 'foreign-script' && finding.params?.script === own)) : findings;
}

export interface FindingInput {
  from: string | null;
  replyTo: string | null;
  returnPath: string | null;
  messageId: string | null;
  authentication: AuthSummary;
  /** The address from List-Post, which a mailing list also puts in Reply-To. */
  listPost?: string | null;
  /** The To header, or null if there is none. Undefined leaves the recipient and subject checks out. */
  to?: string | null;
  subject?: string | null;
  /** Addresses the receiving servers delivered to, from Delivered-To, X-Original-To, Envelope-To and Received. */
  envelopeRecipients?: string[];
  /** To and Cc together. */
  visibleRecipients?: string | null;
  isList?: boolean;
}

// The ICANN part of the Public Suffix List. Its private part, such as vercel.app, stays out, so that
// a free host keeps one base domain for all its pages and the hosting rules can name it.
const SUFFIXES = new Set(Object.entries(SUFFIXES_BY_TLD).flatMap(([tld, heads]) => heads.split(' ').map((head) => `${head}.${tld}`)));
const WILDCARDS = new Set(WILDCARD_SUFFIXES);
const EXCEPTIONS = new Set(EXCEPTION_DOMAINS);

/** How many labels at the end form the public suffix, such as 2 for ac.in. The longest matching rule wins. */
function suffixLength(labels: string[]): number {
  for (let i = 0; i < labels.length; i++) {
    const rest = labels.slice(i).join('.');
    if (EXCEPTIONS.has(rest)) return labels.length - i - 1;
    if (SUFFIXES.has(rest)) return labels.length - i;
    if (i + 1 < labels.length && WILDCARDS.has(labels.slice(i + 1).join('.'))) return labels.length - i;
  }
  return 1;
}

/** The registrable domain, such as example.co.uk for mail.example.co.uk. A bare suffix stays as it is. */
export function baseDomain(domain: string): string {
  const labels = domain.toLowerCase().replace(/\.$/, '').split('.');
  return labels.slice(-Math.min(labels.length, suffixLength(labels) + 1)).join('.');
}

interface ParsedAddress {
  name: string;
  domain: string | null;
  address: string | null;
}

export function parseAddress(value: string | null): ParsedAddress | null {
  if (!value) return null;
  const first = addressParser(value)[0];
  if (!first) return null;
  // A colon in an unquoted name reads as an address group, which hides the real address.
  const inGroup = 'address' in first ? null : /^(.*)<([^<>\s]+@[^<>\s]+)>\s*$/.exec(value);
  if (inGroup) return parseAddress(`"${inGroup[1].replace(/["\\]/g, '').trim()}" <${inGroup[2]}>`);
  const address = 'address' in first ? first.address : undefined;
  const domain = address?.includes('@') ? address.split('@').at(-1)!.toLowerCase() : null;
  return { name: decodeWords(first.name ?? ''), domain, address: address ?? null };
}

/** The domain in From also passed DKIM. Spammers can do this for their own domains too. */
export function isSignedBySender(fromDomain: string | null | undefined, dkim: AuthSummary['dkim']): boolean {
  return Boolean(fromDomain) && dkim?.result === 'pass' && Boolean(dkim.domain) && baseDomain(dkim.domain!) === baseDomain(fromDomain!);
}

export function findIssues(input: FindingInput): Finding[] {
  const findings: Finding[] = [];
  const { spf, dkim, dmarc } = input.authentication;

  if (dmarc?.result === 'fail') {
    findings.push({
      code: 'dmarc-failed',
      severity: 'warning',
    });
  }
  if (spf?.result === 'fail') {
    findings.push({
      code: 'spf-failed',
      severity: 'warning',
    });
  }
  if (spf?.result === 'softfail') {
    findings.push({
      code: 'spf-softfail',
      severity: 'note',
    });
  }
  if (dkim?.result === 'fail') {
    findings.push({
      code: 'dkim-failed',
      severity: 'note',
    });
  }

  if (!spf && !dkim && !dmarc) {
    findings.push({
      code: 'no-check-results',
      severity: 'note',
    });
  } else if ([spf, dkim, dmarc].every((entry) => !entry || entry.result === 'none')) {
    findings.push({
      code: 'not-authenticated',
      severity: 'note',
    });
  }

  const from = parseAddress(input.from);
  if (!from?.domain) {
    findings.push({
      code: 'sender-missing',
      severity: 'warning',
    });
  } else {
    const fromBase = baseDomain(from.domain);

    // A sender domain without an ending, such as mercado-pago475330558, cannot exist on the internet.
    // Measured on 2026-11-05: 187 of 999 Phishing Pot emails, none of the owner's 1872 legitimate emails.
    if (!from.domain.includes('.') && !/^\[.*\]$/.test(from.domain)) {
      findings.push({
        code: 'sender-domain-invalid',
        severity: 'warning',
        params: { domain: from.domain },
      });
    }

    // Every address in the name counts, so that a matching one in front cannot hide a foreign one behind it.
    const nameDomain = [...from.name.matchAll(/[\w.+-]+@([\w-]+(?:\.[\w-]+)+)/g)]
      .map((match) => match[1])
      .find((domain) => baseDomain(domain) !== fromBase);
    if (nameDomain) {
      findings.push({
        code: 'display-name-spoof',
        severity: 'warning',
        params: { shown: nameDomain, domain: from.domain },
      });
    }

    const replyTo = parseAddress(input.replyTo);
    // A mailing list sends replies to itself. Measured on 2026-11-05: Reply-To equal to List-Post in all 5149 emails
    // of 16 Apache lists and in none of 4752 public spam and phishing emails. Free mail stays a sign.
    const replyToList = Boolean(replyTo?.address && input.listPost && replyTo.address.toLowerCase() === input.listPost.toLowerCase())
      && !FREEMAIL_DOMAINS.has(baseDomain(replyTo?.domain ?? ''));
    if (replyTo?.domain && baseDomain(replyTo.domain) !== fromBase && !replyToList) {
      // Shops and payment services often sign their own emails and let replies go to a partner. A list that sends
      // replies elsewhere does not get this benefit: spammers sign their own domain and send through a group there.
      // Measured on 2026-11-05: 1 of 238 private spam emails, none of 1872 private legitimate emails and of 5149
      // emails from Apache lists, 1 of 4752 public spam and phishing emails.
      const replyToFreemail = FREEMAIL_DOMAINS.has(baseDomain(replyTo.domain));
      const eased = isSignedBySender(from.domain, dkim) && !replyToFreemail && !input.listPost;
      // A company that writes from its own domain does not take replies at a free mail provider.
      // Measured on 2026-11-06: 10 of 239 private spam emails, 1 of 1872 legitimate ones.
      const toFreemail = replyToFreemail && !FREEMAIL_DOMAINS.has(fromBase);
      findings.push({
        code: eased ? 'reply-to-signed-sender' : toFreemail ? 'reply-to-freemail' : 'reply-to-other-domain',
        severity: 'note',
        params: { domain: from.domain, other: replyTo.domain },
      });
    }

    // To names the sender's own domain and not the recipient: the email is forged, or the recipient is in Bcc.
    // Measured on 2026-11-06: 1 of 239 private spam emails, 1 of 1872 legitimate ones.
    const envelope = (input.envelopeRecipients ?? []).map((address) => address.toLowerCase());
    const visible = (input.visibleRecipients ?? '').toLowerCase();
    const toAddress = parseAddress(input.visibleRecipients ?? null);
    const envelopeVisible = envelope.some((address) => visible.includes(address) || visible.includes(baseDomain(address.split('@')[1] ?? '')));
    if (envelope.length > 0 && toAddress?.domain && baseDomain(toAddress.domain) === fromBase && !input.isList && !envelopeVisible) {
      findings.push({
        code: 'to-sender-only',
        severity: 'note',
        params: { domain: from.domain },
      });
    }

    // To names someone at another domain, and the email reached you only through Bcc. Spammers send one email
    // to a stranger and many others in Bcc. Measured on 2026-11-07: 5 of 242 private spam emails, 1 of 1872 legitimate ones,
    // 19 of 4752 public spam and phishing emails and none of 5149 emails from Apache lists.
    if (envelope.length > 0 && toAddress?.domain && baseDomain(toAddress.domain) !== fromBase && !input.isList && !envelopeVisible) {
      findings.push({
        code: 'to-stranger',
        severity: 'note',
        params: { other: toAddress.domain },
      });
    }

    const returnPath = parseAddress(input.returnPath);
    if (returnPath?.domain && baseDomain(returnPath.domain) !== fromBase) {
      findings.push({
        code: 'return-path-other-domain',
        severity: 'note',
        params: { domain: from.domain, other: returnPath.domain },
      });
    }
  }

  if (!input.messageId) {
    findings.push({
      code: 'message-id-missing',
      severity: 'note',
    });
  }

  // A mass mailing puts all recipients in Bcc and leaves To out or fills it with an empty group such as
  // "undisclosed-recipients:;", which some senders write as "<undisclosed-recipients:>".
  // Measured on 2026-11-06: 13 of 239 private spam emails, none of 1872 legitimate ones.
  if (input.to !== undefined && (!input.to?.trim() || /^<?[^@<>]*:\s*;?\s*>?$/.test(input.to.trim()))) {
    findings.push({
      code: 'recipients-hidden',
      severity: 'warning',
    });
  }

  // Measured on 2026-11-06: 2 of 239 private spam emails, none of 1872 legitimate ones. Private emails without a
  // subject happen, so it counts less.
  if (input.to !== undefined && !input.subject?.trim()) {
    findings.push({
      code: 'subject-missing',
      severity: 'note',
    });
  }

  return findings.sort((a, b) => Number(a.severity !== 'warning') - Number(b.severity !== 'warning'));
}

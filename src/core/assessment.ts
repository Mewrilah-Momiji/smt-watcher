import type { Finding, FindingCode } from './findings';
import type { ASSESSMENT_LEVELS } from './sharedLists';

export type AssessmentLevel = (typeof ASSESSMENT_LEVELS)[number];

export interface Assessment {
  level: AssessmentLevel;
  /** Findings that led to this level. */
  reasons: Finding[];
  /** Signs that typically belong to fraud rather than plain advertising. */
  phishingSigns: boolean;
}

/**
 * Weights reflect how well each signal separated spam from legitimate email in local measurements.
 * Signals at 0 are still shown but do not count: they either depend on the mail provider
 * (no-check-results, not-authenticated) or do not point to spam (return-path, message-id, a signed sender's Reply-To or tracking links).
 */
const WEIGHTS: Record<FindingCode, number> = {
  'dmarc-failed': 3,
  'spf-failed': 3,
  'display-name-spoof': 3,
  'brand-impersonation': 3,
  'link-ip-host': 3,
  'risky-attachment': 3,
  'dkim-failed': 2,
  'spf-softfail': 2,
  'link-punycode': 2,
  'link-shortener': 1,
  'credential-request': 1,
  'display-name-domain': 1,
  'hidden-characters': 3,
  'styled-letters': 3,
  'garbled-sender-name': 2,
  'unfilled-placeholder': 3,
  'windfall-promise': 3,
  'liquidation-offer': 2,
  'link-public-host': 2,
  'foreign-script': 2,
  'fake-reply': 2,
  'address-in-subject': 2,
  'address-greeting': 2,
  'recipient-org-in-name': 2,
  'mixed-script-words': 3,
  'risky-tld': 1,
  'role-name-external': 2,
  'provider-spam-verdict': 2,
  'sender-domain-invalid': 2,
  'bulk-sender-address': 3,
  'reply-to-other-domain': 1,
  'link-text-mismatch': 1,
  'sender-missing': 1,
  'no-check-results': 0,
  'not-authenticated': 0,
  'return-path-other-domain': 0,
  'reply-to-signed-sender': 0,
  // Votes alone may not make an email risky, and they may never make one look safe.
  'db-reported-spam': 1,
  'db-reported-unverified': 0,
  'db-reported-legit': 0,
  'db-disputed': 0,
  'db-seen-spam': 0,
  'link-text-signed-sender': 0,
  'message-id-missing': 0,
};

const PHISHING_CODES = new Set<FindingCode>(['brand-impersonation', 'display-name-spoof', 'credential-request', 'risky-attachment', 'link-ip-host', 'hidden-characters', 'mixed-script-words', 'styled-letters', 'windfall-promise', 'liquidation-offer']);

const MANY_SIGNS_SCORE = 3;

/** Strongest signs first, as only the first few are shown right away. */
export function rankFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => WEIGHTS[b.code] - WEIGHTS[a.code]);
}

export function assess(findings: Finding[]): Assessment {
  const reasons = findings.filter((finding) => WEIGHTS[finding.code] > 0);
  const score = reasons.reduce((sum, finding) => sum + WEIGHTS[finding.code], 0);
  return {
    level: score >= MANY_SIGNS_SCORE ? 'many-signs' : score > 0 ? 'some-signs' : 'no-signs',
    reasons,
    phishingSigns: reasons.some((finding) => PHISHING_CODES.has(finding.code)),
  };
}

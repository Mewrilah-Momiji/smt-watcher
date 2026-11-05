import type { AssessmentLevel } from './assessment';
import { assess } from './assessment';
import { baseDomain, isSignedBySender, parseAddress } from './findings';
import type { HeaderReport } from './headers';
import { API_BASE, LOOKUP_CODES } from './senderLookup';
import { type AUTH_RESULTS, DOMAIN_PATTERN as DOMAIN, FREEMAIL_DOMAINS, MAX_LINK_DOMAINS, type VERDICTS } from './sharedLists';

export type Verdict = (typeof VERDICTS)[number];
type AuthResult = (typeof AUTH_RESULTS)[number];

/** Off until the privacy text is checked. The switch also decides whether the page may connect to its own server. */
export const SENDER_DB_ENABLED = import.meta.env.VITE_SENDER_DB === '1';

/** Everything that leaves the browser. Nothing here may name the recipient or quote the email. */
export interface Contribution {
  senderDomain: string;
  signedBySender: boolean;
  authentication: { spf: AuthResult; dkim: AuthResult; dmarc: AuthResult };
  codes: string[];
  level: AssessmentLevel;
  linkDomains: string[];
  verdict: Verdict;
  assessmentWrong: boolean;
}

function authResult(result: string | undefined): AuthResult {
  if (result === undefined) return 'none';
  return result === 'pass' || result === 'fail' || result === 'softfail' || result === 'none' ? result : 'other';
}

/** The verdict to preselect after "this assessment is wrong": the opposite of what the page showed. "Some signs" can be wrong either way. */
export function verdictForWrongAssessment(level: AssessmentLevel): Verdict | null {
  if (level === 'some-signs') return null;
  return level === 'no-signs' ? 'spam' : 'legit';
}

/** A wrong assessment counts only if the user said so and the chosen verdict still contradicts the level, as the choice can change afterwards. */
export function isWrongAssessment(level: AssessmentLevel, verdict: Verdict, reported: boolean): boolean {
  if (!reported || verdict === 'unsure') return false;
  if (level === 'no-signs') return verdict === 'spam';
  if (level === 'many-signs') return verdict === 'legit';
  return true;
}

/** Returns null if the sender says nothing useful: free mail is shared by everyone, and one's own domain is personal. */
export function buildContribution(report: HeaderReport, verdict: Verdict, assessmentWrong = false): Contribution | null {
  const domain = parseAddress(report.from)?.domain;
  if (!domain) return null;
  const senderDomain = baseDomain(domain);
  if (!DOMAIN.test(senderDomain) || FREEMAIL_DOMAINS.has(senderDomain)) return null;
  const ownDomains = report.recipientAddresses.map((address) => baseDomain(address.split('@').at(-1) ?? ''));
  if (ownDomains.includes(senderDomain)) return null;

  const { spf, dkim, dmarc } = report.authentication;
  const own = report.findings.filter((finding) => !LOOKUP_CODES.includes(finding.code));
  return {
    senderDomain,
    signedBySender: isSignedBySender(domain, dkim),
    authentication: { spf: authResult(spf?.result), dkim: authResult(dkim?.result), dmarc: authResult(dmarc?.result) },
    // What the database said must not count as a new report on the same sender.
    codes: [...new Set(own.map((finding) => finding.code))],
    level: assess(own).level,
    // The server rejects a report for any other form, and one odd link must not cost the whole report.
    linkDomains: report.linkDomains.filter((link) => DOMAIN.test(link) && !ownDomains.includes(link)).slice(0, MAX_LINK_DOMAINS),
    verdict,
    assessmentWrong,
  };
}

export async function sendContribution(contribution: Contribution): Promise<boolean> {
  const response = await fetch(`${API_BASE}api/report.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contribution),
  });
  return response.ok;
}

import type { Finding, FindingCode } from './findings';
import { baseDomain, isSignedBySender, parseAddress } from './findings';
import { FREEMAIL_DOMAINS } from './sharedLists';
import type { HeaderReport } from './headers';

/** The page asks its own server. The extension has no server of its own and names the page's. */
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? '';

export type LookupResult = 'reported-spam' | 'reported-legit' | 'disputed' | 'seen-spam' | 'none';
const RESULTS: LookupResult[] = ['reported-spam', 'reported-legit', 'disputed', 'seen-spam', 'none'];

/** Findings from the database. They are only hints, and none of them may lower a level. */
export const LOOKUP_CODES: FindingCode[] = ['db-reported-spam', 'db-reported-unverified', 'db-reported-legit', 'db-disputed', 'db-seen-spam'];

/** The domain a lookup would ask about. Free mail says nothing about a sender. */
export function lookupDomain(report: HeaderReport): string | null {
  const domain = parseAddress(report.from)?.domain;
  if (!domain) return null;
  const base = baseDomain(domain);
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(base) && !FREEMAIL_DOMAINS.has(base) ? base : null;
}

/** Turns an answer into a finding. A sender address can be forged, so praise and blame need a signature. */
export function lookupFinding(report: HeaderReport, result: LookupResult): Finding | null {
  const address = parseAddress(report.from)?.domain;
  const domain = lookupDomain(report);
  if (!domain) return null;
  const signed = isSignedBySender(address, report.authentication.dkim);
  const params = { domain };
  switch (result) {
    case 'reported-spam':
      return signed ? { code: 'db-reported-spam', severity: 'warning', params } : { code: 'db-reported-unverified', severity: 'note', params };
    case 'reported-legit':
      return signed ? { code: 'db-reported-legit', severity: 'note', params } : null;
    case 'disputed':
      return { code: 'db-disputed', severity: 'note', params };
    case 'seen-spam':
      return { code: 'db-seen-spam', severity: 'note', params };
    case 'none':
      return null;
  }
}

export async function lookUpSender(domain: string): Promise<LookupResult> {
  const response = await fetch(`${API_BASE}api/lookup.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderDomain: domain }),
  });
  if (!response.ok) throw new Error('lookup failed');
  const { result } = (await response.json()) as { result?: LookupResult };
  if (!result || !RESULTS.includes(result)) throw new Error('lookup failed');
  return result;
}

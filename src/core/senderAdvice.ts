import { parseHeaders } from './headers';

export type AdviceSource = 'spamhaus' | 'spamcop' | 'barracuda';

// Only pages that were opened and checked. The page links to them in the technical details and queries none of them,
// as querying needs terms that a public page cannot meet or that could not be read.
export const ADVICE_SOURCES: Record<AdviceSource, string> = {
  spamhaus: 'https://check.spamhaus.org/',
  spamcop: 'https://www.spamcop.net/bl.shtml',
  barracuda: 'https://www.barracudacentral.org/lookups',
};

export const BLOCKLIST_PAGES: AdviceSource[] = ['spamhaus', 'spamcop', 'barracuda'];

export function hasUnsubscribeHeader(rawHeaders: string): boolean {
  return parseHeaders(rawHeaders).some((header) => header.name.toLowerCase() === 'list-unsubscribe');
}

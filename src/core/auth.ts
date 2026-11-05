import type { Header } from './headers';

export type AuthMethod = 'spf' | 'dkim' | 'dmarc';

export type AuthSource = 'authentication-results' | 'received-spf' | 'spam-filter';

export interface AuthResult {
  method: AuthMethod;
  result: string;
  domain: string | null;
  source: AuthSource;
}

export type AuthSummary = Record<AuthMethod, AuthResult | null>;

/** A provider-specific header of unknown meaning and origin. Shown as is, never used for findings. */
export interface ProviderSignal {
  name: string;
  value: string;
}

const PROVIDER_SIGNAL_NAMES = new Set(['x-dmarc-test', 'x-spf-fail']);

const DOMAIN_PROPERTIES: Record<AuthMethod, string[]> = {
  spf: ['smtp.mailfrom', 'smtp.helo'],
  dkim: ['header.d', 'header.i'],
  dmarc: ['header.from'],
};

const SPAM_FILTER_TESTS: Record<string, [AuthMethod, string]> = {
  SPF_PASS: ['spf', 'pass'],
  SPF_FAIL: ['spf', 'fail'],
  SPF_SOFTFAIL: ['spf', 'softfail'],
  SPF_NEUTRAL: ['spf', 'neutral'],
  SPF_NONE: ['spf', 'none'],
  DKIM_VALID: ['dkim', 'pass'],
  DKIM_INVALID: ['dkim', 'fail'],
};

function stripComments(value: string): string {
  let current = value;
  let previous;
  do {
    previous = current;
    current = current.replace(/\([^()]*\)/g, ' ');
  } while (current !== previous);
  return current;
}

function propertyDomain(segment: string, method: AuthMethod): string | null {
  for (const property of DOMAIN_PROPERTIES[method]) {
    const match = new RegExp(`(?:^|\\s)${property.replace('.', '\\.')}\\s*=\\s*"?([^\\s";]+)`, 'i').exec(segment);
    if (!match) continue;
    const domain = match[1].split('@').at(-1)!.toLowerCase();
    if (domain && domain !== 'none') return domain;
  }
  return null;
}

/** Reads an Authentication-Results header. Microsoft omits the leading server ID. */
export function parseAuthenticationResults(value: string): { serverId: string | null; results: AuthResult[] } {
  const segments = stripComments(value).split(';').map((segment) => segment.trim());
  const serverId = segments[0] && !segments[0].includes('=') ? segments[0].split(/\s+/)[0].toLowerCase() : null;

  const results: AuthResult[] = [];
  for (const segment of segments) {
    const match = /^(spf|dkim|dmarc)\s*=\s*([a-z]+)/i.exec(segment);
    if (!match) continue;
    const method = match[1].toLowerCase() as AuthMethod;
    results.push({
      method,
      result: match[2].toLowerCase(),
      domain: propertyDomain(segment, method),
      source: 'authentication-results',
    });
  }
  return { serverId, results };
}

/** Senders can write their own headers, and those end up below the oldest Received line. */
function headersAddedByServers(headers: Header[]): Header[] {
  const oldestReceived = headers.findLastIndex((header) => header.name.toLowerCase() === 'received');
  return oldestReceived < 0 ? headers : headers.slice(0, oldestReceived);
}

function fromReceivedSpf(value: string): AuthResult | null {
  const result = /^\s*([a-z]+)/i.exec(value)?.[1]?.toLowerCase();
  return result ? { method: 'spf', result, domain: null, source: 'received-spf' } : null;
}

function fromSpamFilter(value: string): AuthResult[] {
  const tests = /\btests=(.*?)(?:\s+[a-z]+=|$)/i.exec(value)?.[1] ?? '';
  return tests
    .split(/[\s,]+/)
    .flatMap((test) => {
      const entry = SPAM_FILTER_TESTS[test];
      return entry ? [{ method: entry[0], result: entry[1], domain: null, source: 'spam-filter' as const }] : [];
    });
}

/**
 * Prefers the topmost Authentication-Results, written last by a receiving server.
 * Many providers only record some methods there, so standard fallbacks fill the gaps.
 */
export function summarizeAuthentication(headers: Header[]): AuthSummary {
  const summary: AuthSummary = { spf: null, dkim: null, dmarc: null };
  const trusted = headersAddedByServers(headers);
  const withName = (name: string) => trusted.filter((header) => header.name.toLowerCase() === name);

  const parsed = withName('authentication-results').map((header) => parseAuthenticationResults(header.value));
  const top = parsed[0];
  const sameServer = !top ? [] : top.serverId ? parsed.filter((entry) => entry.serverId === top.serverId) : [top];

  const add = (result: AuthResult) => {
    const current = summary[result.method];
    // A message can carry several DKIM signatures, and one valid signature is enough.
    if (!current || (current.source === result.source && current.result !== 'pass' && result.result === 'pass')) {
      summary[result.method] = result;
    }
  };

  sameServer.flatMap((entry) => entry.results).forEach(add);

  const receivedSpf = withName('received-spf')[0];
  const spfResult = receivedSpf && fromReceivedSpf(receivedSpf.value);
  if (spfResult) add(spfResult);

  const spamStatus = withName('x-spam-status')[0];
  if (spamStatus) fromSpamFilter(spamStatus.value).forEach(add);

  return summary;
}

/**
 * A receiving server's own spam verdict, such as "X-Spam-Flag: YES". A sender gains nothing by adding one, so a verdict
 * of spam can be trusted even below the oldest Received header. A verdict of no spam could be forged and is ignored.
 */
export function providerSaysSpam(headers: Header[]): boolean {
  return headers.some(({ name, value }) => {
    const lower = name.toLowerCase();
    return (lower === 'x-spam-flag' || lower === 'x-spam' || lower === 'x-spam-status') && /^\s*yes\b/i.test(value);
  });
}

export function collectProviderSignals(headers: Header[]): ProviderSignal[] {
  // Providers also append these below the oldest Received, so position cannot rule out forgery.
  return headers
    .filter((header) => PROVIDER_SIGNAL_NAMES.has(header.name.toLowerCase()))
    .map(({ name, value }) => ({ name, value }));
}

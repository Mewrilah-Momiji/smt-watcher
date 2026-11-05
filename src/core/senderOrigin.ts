import { baseDomain } from './findings';
import type { Header, ReceivedHop } from './headers';

export interface SenderOrigin {
  ip: string;
  /** The name the sending server gave for itself. It can be forged. */
  claimedName: string | null;
  /** The timestamp recorded by the receiving server. */
  receivedAt: string | null;
}

export function isPublicIp(ip: string): boolean {
  if (ip.includes(':')) {
    const lower = ip.toLowerCase();
    return !(lower === '::1' || /^(fc|fd|fe[89ab])/.test(lower) || lower.startsWith('::ffff:'));
  }
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part > 255)) return false;
  const [a, b] = parts;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

/**
 * Finds the server that handed the email to the recipient's mail provider.
 * Only servers of that provider are trusted, as senders can forge all older entries.
 * Hops run from oldest to newest.
 */
export function findSenderOrigin(hops: ReceivedHop[]): SenderOrigin | null {
  const newestBy = hops.at(-1)?.by;
  if (!newestBy) return null;
  const receiver = baseDomain(newestBy);

  let origin: SenderOrigin | null = null;
  for (let index = hops.length - 1; index >= 0; index--) {
    const hop = hops[index];
    if (!hop.by || baseDomain(hop.by) !== receiver) break;
    if (hop.ip && isPublicIp(hop.ip)) origin = { ip: hop.ip, claimedName: hop.from, receivedAt: hop.date };
  }
  return origin;
}

const RECIPIENT_HEADERS = new Set(['to', 'cc', 'delivered-to', 'x-original-to', 'envelope-to', 'x-envelope-to', 'x-delivered-to']);
const ADDRESS_PATTERN = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

/** Finds the addresses this email was delivered to, which identify the person reporting it. */
export function findRecipientAddresses(headers: Header[]): string[] {
  const addresses = new Set<string>();
  for (const { name, value } of headers) {
    const lower = name.toLowerCase();
    const relevant = RECIPIENT_HEADERS.has(lower) ? value : lower === 'received' ? (/\bfor\s+<?([^\s<>;]+@[^\s<>;]+)>?/i.exec(value)?.[1] ?? '') : '';
    for (const match of relevant.matchAll(ADDRESS_PATTERN)) addresses.add(match[0]);
  }
  return [...addresses];
}

/** Replaces the recipient addresses wherever they appear in a text. */
export function redactRecipients(text: string, addresses: string[]): string {
  let result = text;
  for (const address of addresses) {
    result = result.replace(new RegExp(address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[redacted]');
  }
  return result;
}

/** Blanks recipient headers entirely, as they also hold names, and redacts the addresses elsewhere. */
export function redactHeaderBlock(raw: string, addresses: string[]): string {
  const lines: string[] = [];
  let insideRecipientHeader = false;
  for (const line of raw.split(/\r?\n/)) {
    const isContinuation = /^[ \t]/.test(line);
    if (!isContinuation) {
      const name = line.slice(0, Math.max(line.indexOf(':'), 0)).trim().toLowerCase();
      insideRecipientHeader = RECIPIENT_HEADERS.has(name);
      lines.push(insideRecipientHeader ? `${line.slice(0, line.indexOf(':'))}: [redacted]` : line);
    } else if (!insideRecipientHeader) {
      lines.push(line);
    }
  }
  return redactRecipients(lines.join('\n'), addresses);
}

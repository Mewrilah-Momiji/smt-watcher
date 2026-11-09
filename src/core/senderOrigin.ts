import { baseDomain, type Finding } from './findings';
import type { Header, ReceivedHop } from './headers';

export interface SenderOrigin {
  ip: string;
  /** The name the sending server gave for itself. It can be forged. */
  claimedName: string | null;
  /** The name the receiving server found for the IP address. */
  reverseName: string | null;
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
    if (hop.ip && isPublicIp(hop.ip)) origin = { ip: hop.ip, claimedName: hop.from, reverseName: hop.reverseName ?? null, receivedAt: hop.date };
  }
  return origin;
}

// Rented virtual servers that hand an email straight to the recipient's provider, with no mail service in between.
// Only hosts measured on 2026-11-09: 17 of 255 private spam emails (all Google Cloud), 12 of 1303 Nazario 2023-2025 emails
// (Contabo and OVH), none of 1872 legitimate emails or 5149 Apache list emails. Hetzner (your-server.de) and Azure
// (cloudapp.azure.com) were left out, as they matched 3 legitimate emails.
const CLOUD_VM_PATTERN = /(?:^|\.)(?:bc\.googleusercontent\.com|contaboserver\.net|ip-\d{1,3}-\d{1,3}-\d{1,3}\.eu)$/;
// Mail servers can lag a few minutes, and senders' clocks too. Measured on 2026-11-09 with more than two hours:
// 1 of 255 private spam emails, 21 of 1303 Nazario 2023-2025 emails, none of 1872 legitimate emails or 5149 Apache list emails.
const FUTURE_DATE_HOURS = 2;

/** A time from a Date or Received header, with a trailing comment such as "(CET)" left out. */
function parseMailDate(value: string): number {
  return Date.parse(value.replace(/\s*\([^)]*\)\s*$/, ''));
}

/** Signs in how the email reached the recipient's provider, read only from entries that provider wrote. */
export function findOriginIssues(origin: SenderOrigin | null, date: string | null): Finding[] {
  const findings: Finding[] = [];
  if (!origin) return findings;
  if (origin.reverseName && CLOUD_VM_PATTERN.test(origin.reverseName)) {
    findings.push({ code: 'sender-cloud-vm', severity: 'warning', params: { host: origin.reverseName } });
  }
  if (date && origin.receivedAt) {
    const hours = (parseMailDate(date) - parseMailDate(origin.receivedAt)) / 3_600_000;
    if (hours > FUTURE_DATE_HOURS) {
      findings.push({ code: 'date-in-future', severity: 'note', params: { hours: String(Math.round(hours)) } });
    }
  }
  return findings;
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

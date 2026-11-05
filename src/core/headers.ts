import { decodeWords } from 'postal-mime';
import { collectProviderSignals, providerSaysSpam, summarizeAuthentication, type AuthSummary, type ProviderSignal } from './auth';
import { extractLinks, findContentIssues, type MailContent } from './content';
import { baseDomain, findIssues, isSignedBySender, parseAddress, type Finding } from './findings';
import { findRecipientAddresses } from './senderOrigin';

export interface Header {
  name: string;
  value: string;
}

export interface ReceivedHop {
  from: string | null;
  by: string | null;
  ip: string | null;
  date: string | null;
}

export interface HeaderReport {
  from: string | null;
  to: string | null;
  subject: string | null;
  date: string | null;
  returnPath: string | null;
  replyTo: string | null;
  messageId: string | null;
  /** From oldest to newest. Early entries can be forged. */
  received: ReceivedHop[];
  authentication: AuthSummary;
  providerSignals: ProviderSignal[];
  findings: Finding[];
  rawHeaders: string;
  /** Addresses in rawHeaders that identify the recipient. */
  recipientAddresses: string[];
  bodyText: string | null;
  /** Base domains of the email's links, sorted. */
  linkDomains: string[];
  /** Without HTML, links can only be read from the plain text. */
  hasHtml: boolean;
}

/** Splits a header block and joins folded lines. */
export function parseHeaders(raw: string): Header[] {
  const headers: Header[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (line === '') break;
    if (/^[ \t]/.test(line)) {
      const last = headers.at(-1);
      if (last) last.value += ' ' + line.trim();
      continue;
    }
    const colon = line.indexOf(':');
    if (colon > 0) {
      headers.push({ name: line.slice(0, colon).trim(), value: line.slice(colon + 1).trim() });
    }
  }
  return headers;
}

export function parseReceived(value: string): ReceivedHop {
  const semicolon = value.lastIndexOf(';');
  const route = semicolon >= 0 ? value.slice(0, semicolon) : value;
  // The IP must come from the "from" part, as the "by" part names the receiving server.
  const fromPart = route.split(/\bby\s/i)[0];
  return {
    from: /\bfrom\s+(\S+)/i.exec(route)?.[1] ?? null,
    by: /\bby\s+(\S+)/i.exec(route)?.[1] ?? null,
    ip:
      /\[(?:IPv6:)?([0-9a-f:.]+)\]/i.exec(fromPart)?.[1] ??
      /\(((?:\d{1,3}\.){3}\d{1,3}|[0-9a-f]*:[0-9a-f:.]+)\)/i.exec(fromPart)?.[1] ??
      null,
    date: semicolon >= 0 ? value.slice(semicolon + 1).trim() || null : null,
  };
}

export function buildReport(raw: string, content: Partial<MailContent> = {}): HeaderReport {
  const subject = content.subject ?? null;
  const bodyText = content.bodyText ?? null;
  const headers = parseHeaders(raw);
  const first = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name)?.value ?? null;

  const decoded = (name: string) => {
    const value = first(name);
    return value === null ? null : decodeWords(value);
  };

  const from = first('from');
  const replyTo = first('reply-to');
  const returnPath = first('return-path');
  const messageId = first('message-id');
  const authentication = summarizeAuthentication(headers);
  const sender = parseAddress(from);

  return {
    from: from === null ? null : decodeWords(from),
    to: decoded('to'),
    subject: subject ?? decoded('subject'),
    date: first('date'),
    returnPath,
    replyTo: replyTo === null ? null : decodeWords(replyTo),
    messageId,
    rawHeaders: raw.trim(),
    recipientAddresses: findRecipientAddresses(headers),
    bodyText,
    linkDomains: [...new Set(extractLinks(content.bodyHtml ?? null, bodyText).map((link) => baseDomain(link.host)))].sort(),
    hasHtml: Boolean(content.bodyHtml),
    authentication,
    providerSignals: collectProviderSignals(headers),
    findings: [
      ...findIssues({ from, replyTo, returnPath, messageId, authentication, listPost: /<mailto:([^>?]+)/i.exec(first('list-post') ?? '')?.[1] ?? null }),
      // Providers also mark legitimate newsletters, so the verdict counts only for emails no sender signed.
      // Measured on 2026-11-05: 4 of the owner's 1872 legitimate emails, 52 of 237 spam emails.
      ...(providerSaysSpam(headers) && authentication.dkim?.result !== 'pass' ? [{ code: 'provider-spam-verdict' as const, severity: 'note' as const }] : []),
      ...findContentIssues(
        { subject: subject ?? decoded('subject'), bodyText, bodyHtml: content.bodyHtml ?? null, attachmentNames: content.attachmentNames ?? [] },
        {
          fromName: sender?.name ?? '',
          fromDomain: sender?.domain ?? null,
          fromAddress: sender?.address ?? null,
          hasReplyHeaders: Boolean(first('in-reply-to') ?? first('references')),
          recipientAddresses: findRecipientAddresses(headers),
          signedBySender: isSignedBySender(sender?.domain, authentication.dkim),
        },
      ),
    ].sort((a, b) => Number(a.severity !== 'warning') - Number(b.severity !== 'warning')),
    received: headers
      .filter((h) => h.name.toLowerCase() === 'received')
      .map((h) => parseReceived(h.value))
      .reverse(),
  };
}

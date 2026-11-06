import PostalMime from 'postal-mime';
import { buildReport, parseHeaders, type HeaderReport } from './headers';
import { htmlToText } from './phones';

export type MailErrorCode = 'wrong-type' | 'no-pasted-headers' | 'msg-unreadable' | 'msg-no-headers' | 'eml-no-headers';

export class MailReadError extends Error {
  constructor(readonly code: MailErrorCode) {
    super(code);
  }
}

/** Emails without stored headers (such as drafts) cannot be analyzed. */
export class MissingHeadersError extends MailReadError {}

export async function readMail(fileName: string, data: ArrayBuffer): Promise<HeaderReport> {
  const extension = fileName.toLowerCase().split('.').at(-1);
  if (extension === 'msg') return (await import('./readMsg')).readMsg(data);
  if (extension === 'eml') return readEml(data);
  // Phones cannot save .eml files, but the copied source saved as text is the same email.
  if (extension === 'txt') return readEml(textAsEml(data));
  throw new MailReadError('wrong-type');
}

/** Removes what text editors add to a saved source: a byte order mark, or UTF-16 from Windows editors. */
export function textAsEml(data: ArrayBuffer): ArrayBuffer {
  const bytes = new Uint8Array(data);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return data.slice(3);
  if ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff)) {
    const text = new TextDecoder(bytes[0] === 0xff ? 'utf-16le' : 'utf-16be').decode(bytes.subarray(2));
    return new TextEncoder().encode(text).buffer as ArrayBuffer;
  }
  return data;
}

/** Reads text copied from a mail program. It can hold only the headers or the whole email. */
export async function readPastedText(text: string): Promise<{ report: HeaderReport; data: ArrayBuffer }> {
  const trimmed = text.trim();
  const names = parseHeaders(trimmed).map((header) => header.name.toLowerCase());
  if (!names.includes('from') && !names.includes('received')) {
    throw new MissingHeadersError('no-pasted-headers');
  }
  const data = new TextEncoder().encode(trimmed).buffer as ArrayBuffer;
  return { report: await readEml(data), data };
}

/**
 * Headers are ASCII, but some senders write names in raw UTF-8 (RFC 6532). Read as Latin-1 they turn into
 * "MÃ¼ller", which the garbled name check would count against the sender. Latin-1 stays the fallback.
 */
function headerText(bytes: Uint8Array, latin1: string): string {
  if (!bytes.some((byte) => byte > 0x7f)) return latin1;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return latin1;
  }
}

async function readEml(data: ArrayBuffer): Promise<HeaderReport> {
  const latin1 = new TextDecoder('latin1').decode(data);
  const end = /\r?\n\r?\n/.exec(latin1)?.index ?? latin1.length;
  const raw = headerText(new Uint8Array(data, 0, end), latin1.slice(0, end));
  if (!/^[\w-]+:/m.test(raw)) {
    throw new MissingHeadersError('eml-no-headers');
  }
  // postal-mime decodes encoded subjects such as =?UTF-8?...?=
  const parsed = await PostalMime.parse(data);
  return buildReport(raw, {
    subject: parsed.subject ?? null,
    bodyText: parsed.text ?? (parsed.html ? htmlToText(parsed.html) : null),
    bodyHtml: parsed.html ?? null,
    attachmentNames: parsed.attachments.flatMap((attachment) => attachment.filename ?? []),
  });
}

import { parseHeaders } from './headers';
import { MailReadError } from './readMail';
import { MsgReaderClass } from './readMsg';
import { htmlFromCompressedRtf } from './rtfHtml';

export interface EmlResult {
  eml: Uint8Array<ArrayBuffer>;
  skippedAttachments: number;
}

/** These describe the original structure, which a .msg no longer has. */
const STRUCTURE_HEADERS = new Set(['content-type', 'content-transfer-encoding', 'content-length', 'mime-version']);

const LINE_END = '\r\n';

function base64Lines(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/.{1,76}/g, `$&${LINE_END}`);
}

function textPart(contentType: string, text: string): string {
  return [
    `Content-Type: ${contentType}; charset=utf-8`,
    'Content-Transfer-Encoding: base64',
    '',
    base64Lines(new TextEncoder().encode(text)),
  ].join(LINE_END);
}

function headerSafeFileName(name: string): string {
  return name.replace(/[^\w.-]+/g, '_').slice(0, 100) || 'attachment';
}

/**
 * Rebuilds an email from a .msg file. The original headers stay as they were, apart from the
 * structure headers. The result is a reconstruction and is marked as one in its headers.
 */
export function msgToEml(data: ArrayBuffer): EmlResult {
  const reader = new MsgReaderClass(data);
  const file = reader.getFileData();
  if (file.dataType !== 'msg' || !file.headers?.trim()) {
    throw new MailReadError('msg-no-headers');
  }

  const kept = keepHeaderLines(file.headers);
  const html =
    file.bodyHtml ??
    (file.html ? new TextDecoder().decode(file.html) : null) ??
    (file.compressedRtf ? htmlFromCompressedRtf(file.compressedRtf) : null);

  const stamp = Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const mixed = `mixed-${stamp}`;
  const alternative = `alternative-${stamp}`;

  const parts = [
    `--${mixed}${LINE_END}Content-Type: multipart/alternative; boundary="${alternative}"${LINE_END}`,
    `--${alternative}${LINE_END}${textPart('text/plain', file.body ?? '')}`,
    ...(html ? [`--${alternative}${LINE_END}${textPart('text/html', html)}`] : []),
    `--${alternative}--${LINE_END}`,
  ];

  let skippedAttachments = 0;
  for (const attachment of file.attachments ?? []) {
    try {
      const { fileName, content } = reader.getAttachment(attachment);
      parts.push(
        [
          `--${mixed}`,
          'Content-Type: application/octet-stream',
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${headerSafeFileName(fileName)}"`,
          '',
          base64Lines(content),
        ].join(LINE_END),
      );
    } catch {
      skippedAttachments++;
    }
  }
  parts.push(`--${mixed}--${LINE_END}`);

  const head = [
    kept,
    'X-Converted-From: msg',
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${mixed}"`,
    '',
    '',
  ].join(LINE_END);

  return { eml: new TextEncoder().encode(head + parts.join('')), skippedAttachments };
}

function keepHeaderLines(raw: string): string {
  const lines: string[] = [];
  let keep = true;
  for (const line of raw.trim().split(/\r?\n/)) {
    if (!/^[ \t]/.test(line)) {
      const name = parseHeaders(line)[0]?.name.toLowerCase();
      keep = !name || !STRUCTURE_HEADERS.has(name);
    }
    if (keep) lines.push(line);
  }
  return lines.join(LINE_END);
}

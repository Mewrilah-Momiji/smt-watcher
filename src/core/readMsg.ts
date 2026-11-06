import MsgReader from '@kenjiuno/msgreader';
import type { MailContent } from './content';
import { buildReport, type HeaderReport } from './headers';
import { htmlToText } from './phones';
import { MailReadError, MissingHeadersError } from './readMail';
import { htmlFromCompressedRtf } from './rtfHtml';

// Depending on the bundler, the class is exposed directly or one level down under "default".
export const MsgReaderClass =
  (MsgReader as unknown as { default?: typeof MsgReader }).default ?? MsgReader;

// Kept apart from readMail, as these libraries make up most of the page and only .msg files need them.
export function readMsg(data: ArrayBuffer): HeaderReport {
  let headers: string | undefined;
  let content: MailContent;
  try {
    const reader = new MsgReaderClass(data);
    const file = reader.getFileData();
    if (file.dataType !== 'msg') throw new Error('not a message object');
    headers = file.headers;
    // An empty HTML part must not hide the compressed RTF, which then holds the real body.
    const bodyHtml =
      file.bodyHtml?.trim() ||
      (file.html ? new TextDecoder().decode(file.html).trim() : '') ||
      (file.compressedRtf ? htmlFromCompressedRtf(file.compressedRtf) : null) ||
      null;
    content = {
      subject: file.subject ?? null,
      bodyText: file.body ?? (bodyHtml ? htmlToText(bodyHtml) : null),
      bodyHtml,
      attachmentNames: (file.attachments ?? []).flatMap((attachment) => attachment.fileName ?? attachment.name ?? []),
    };
  } catch {
    throw new MailReadError('msg-unreadable');
  }
  if (!headers?.trim()) {
    throw new MissingHeadersError('msg-no-headers');
  }
  return buildReport(headers, content);
}

import { burn, type Entry } from '@kenjiuno/msgreader/lib/Burner.js';
import { TypeEnum } from '@kenjiuno/msgreader/lib/Reader.js';

const HEADERS = [
  'Received: from sending.example.net (sending.example.net [198.51.100.7])',
  '\tby mx.recipient.example with ESMTPS id def456;',
  '\tSun, 01 Nov 2026 10:00:02 +0100',
  'From: "Super Offer" <offer@shop.example.org>',
  'To: max.muster@recipient.example',
  'Subject: Offer in a msg file',
  'Date: Sun, 01 Nov 2026 09:59:58 +0100',
  'Message-ID: <12345@sending.example.net>',
  'Content-Type: text/plain; charset=utf-8',
].join('\r\n');

// The hex escape matters: real RTF is full of them, and only they need the parser's global Buffer.
const MSG_HTML = "<p>Gl\\'fcck! Call now: 0900 1234567</p>";

function utf16(text: string): Buffer {
  return Buffer.from(text, 'utf16le');
}

/** Stored like compressed RTF, in the variant of that format that does not compress. */
function storedRtf(html: string): Buffer {
  const rtf = Buffer.from(`{\\rtf1\\ansi\\ansicpg1252\\fromhtml1 {\\*\\htmltag ${html}}}`, 'latin1');
  const head = Buffer.alloc(16);
  head.writeUInt32LE(rtf.length + 12, 0);
  head.writeUInt32LE(rtf.length, 4);
  head.write('MELA', 8, 'latin1');
  return Buffer.concat([head, rtf]);
}

/**
 * Builds a .msg file, as real emails must stay out of the repository. It has no plain text body,
 * like many emails from Outlook, so its text can only come from the compressed RTF.
 */
export function buildMsg(): Buffer {
  const streams: [string, Buffer][] = [
    ['__substg1.0_0037001F', utf16('Offer in a msg file')],
    ['__substg1.0_007D001F', utf16(HEADERS)],
    ['__substg1.0_10090102', storedRtf(MSG_HTML)],
    ['__properties_version1.0', Buffer.alloc(32)],
  ];
  const entries: Entry[] = [
    { name: 'Root Entry', type: TypeEnum.ROOT, length: 0, children: streams.map((_, index) => index + 1) },
    // The burner reads a Buffer's whole shared memory, so each stream gets its own copy.
    ...streams.map(([name, data]) => ({ name, type: TypeEnum.DOCUMENT, length: data.length, binaryProvider: () => new Uint8Array(data) })),
  ];
  return Buffer.from(burn(entries));
}

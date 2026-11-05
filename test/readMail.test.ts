import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseHeaders, parseReceived } from '../src/core/headers';
import { MailReadError, MissingHeadersError, readMail, readPastedText } from '../src/core/readMail';

function fixture(name: string): ArrayBuffer {
  const file = readFileSync(new URL(`./fixtures/${name}`, import.meta.url));
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
}

describe('parseHeaders', () => {
  it('joins folded lines', () => {
    expect(parseHeaders('Subject: Hello\r\n\tWorld\r\nTo: a@example.org\r\n\r\nFrom: Text')).toEqual([
      { name: 'Subject', value: 'Hello World' },
      { name: 'To', value: 'a@example.org' },
    ]);
  });
});

describe('parseReceived', () => {
  it('reads server, IP address and time', () => {
    expect(
      parseReceived('from a.example (a.example [198.51.100.7]) by b.example; Sun, 01 Nov 2026 10:00:02 +0100'),
    ).toEqual({
      from: 'a.example',
      by: 'b.example',
      ip: '198.51.100.7',
      date: 'Sun, 01 Nov 2026 10:00:02 +0100',
    });
  });

  it('handles a missing timestamp', () => {
    expect(parseReceived('by b.example').date).toBeNull();
  });
});

describe('readPastedText', () => {
  const headers = 'Received: from a.example (a.example [198.51.100.7]) by b.example; Sun, 01 Nov 2026 10:00:02 +0100\nFrom: Sender <x@a.example>\nSubject: Hello';

  it('reads headers alone', async () => {
    const { report } = await readPastedText(`\n  ${headers}\n`);
    expect(report.from).toContain('x@a.example');
    expect(report.subject).toBe('Hello');
    expect(report.received).toHaveLength(1);
    expect(report.bodyText).toBeNull();
  });

  it('reads a full email source including its text', async () => {
    const { report } = await readPastedText(`${headers}\nContent-Type: text/plain\n\nTel: 0900 1234567`);
    expect(report.bodyText).toContain('0900 1234567');
  });

  it.each(['', 'Just some text', 'Hallo: das ist kein Header'])('rejects %j', async (text) => {
    await expect(readPastedText(text)).rejects.toBeInstanceOf(MissingHeadersError);
  });
});

describe('readMail', () => {
  it('analyzes an .eml file', async () => {
    const report = await readMail('advertising.eml', fixture('advertising.eml'));
    expect(report.subject).toBe('Glückwunsch!');
    expect(report.from).toContain('offer@shop.example.org');
    expect(report.returnPath).toBe('<bounce@sending.example.net>');
    expect(report.replyTo).toBe('reply@other-domain.example.com');
    expect(report.received.map((hop) => hop.ip)).toEqual(['198.51.100.7', '192.0.2.10']);
  });

  it('reads a source saved as .txt on a phone, with a byte order mark and plain line breaks', async () => {
    const source = new TextDecoder().decode(fixture('advertising.eml')).replace(/\r\n/g, '\n');
    const saved = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(source)]);
    const report = await readMail('Notiz.txt', saved.buffer);
    expect(report.subject).toBe('Glückwunsch!');
    expect(report.from).toContain('offer@shop.example.org');
    expect(report.received.map((hop) => hop.ip)).toEqual(['198.51.100.7', '192.0.2.10']);
  });

  it('reads a source saved as UTF-16 .txt by a Windows editor', async () => {
    const source = new TextDecoder().decode(fixture('advertising.eml'));
    const utf16 = new Uint8Array(2 + source.length * 2);
    utf16.set([0xff, 0xfe]);
    for (let i = 0; i < source.length; i++) utf16.set([source.charCodeAt(i) & 0xff, source.charCodeAt(i) >> 8], 2 + i * 2);
    const report = await readMail('source.txt', utf16.buffer);
    expect(report.subject).toBe('Glückwunsch!');
  });

  it('reports .txt files that hold no email', async () => {
    const note = new TextEncoder().encode('shopping list').buffer as ArrayBuffer;
    await expect(readMail('note.txt', note)).rejects.toBeInstanceOf(MissingHeadersError);
  });

  it('rejects other file types', async () => {
    await expect(readMail('image.png', new ArrayBuffer(1))).rejects.toBeInstanceOf(MailReadError);
  });

  it('reports broken .msg files', async () => {
    await expect(readMail('broken.msg', new ArrayBuffer(16))).rejects.toBeInstanceOf(MailReadError);
  });

  it('reports .eml files without headers', async () => {
    const empty = new TextEncoder().encode('text only').buffer as ArrayBuffer;
    await expect(readMail('empty.eml', empty)).rejects.toBeInstanceOf(MissingHeadersError);
  });
});

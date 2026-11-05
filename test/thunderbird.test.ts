import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createDraftOpener, openAnalysis, type ComposeDetails } from '../extensions/thunderbird/thunderbirdApi';

const original = new File(['raw email'], 'message.eml');

function fakeCompose() {
  const calls: ComposeDetails[] = [];
  return { calls, compose: { beginNew: vi.fn(async (details: ComposeDetails) => { calls.push(details); }) } };
}

describe('createDraftOpener', () => {
  it('opens a draft with the original attached', async () => {
    const { calls, compose } = fakeCompose();
    await createDraftOpener({ compose }, original).openDraft({ to: 'a@b.example', subject: 'S', body: 'B', attachOriginal: true });
    expect(calls).toEqual([
      { to: 'a@b.example', subject: 'S', plainTextBody: 'B', isPlainText: true, attachments: [{ file: original, name: 'original-email.eml' }] },
    ]);
  });

  it('never attaches the original to an abuse draft, which has no recipient yet', async () => {
    const { calls, compose } = fakeCompose();
    await createDraftOpener({ compose }, original).openDraft({ to: null, subject: 'S', body: 'B', attachOriginal: false });
    expect(calls[0]).toEqual({ subject: 'S', plainTextBody: 'B', isPlainText: true });
  });
});

describe('openAnalysis', () => {
  const run = async (messages: { id: number }[]) => {
    const create = vi.fn(async () => undefined);
    await openAnalysis({ messageDisplay: { getDisplayedMessages: async () => ({ messages }) }, tabs: { create } }, 7);
    return create.mock.calls[0];
  };

  it('opens the page for a single email', async () => {
    expect(await run([{ id: 42 }])).toEqual([{ url: 'page.html?id=42' }]);
  });

  it.each([[[]], [[{ id: 1 }, { id: 2 }]]])('asks for one email otherwise', async (messages) => {
    expect(await run(messages)).toEqual([{ url: 'page.html?error=selection' }]);
  });
});

describe('manifest', () => {
  const manifest = JSON.parse(readFileSync(new URL('../extensions/thunderbird/public/manifest.json', import.meta.url), 'utf8'));

  it('requests no permission to send, to read other data or to reach other servers', () => {
    expect(manifest.permissions).toEqual(['messagesRead', 'compose']);
    // The build replaces this placeholder with VITE_SITE_URL from .env.local.
    expect(manifest.host_permissions).toEqual(['https://smtw.example.org/*']);
  });
});

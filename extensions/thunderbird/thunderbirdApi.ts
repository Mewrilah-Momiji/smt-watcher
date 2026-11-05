import type { DraftOpener, EmailDraft } from '../../src/reportView';

/** The parts of the Thunderbird API this extension uses. It has no permission to send. */
export interface ThunderbirdApi {
  messages: {
    getRaw(messageId: number, options: { data_format: 'File' }): Promise<File>;
  };
  messageDisplay: {
    getDisplayedMessages(tabId?: number): Promise<{ messages: { id: number }[] }>;
  };
  messageDisplayAction: {
    onClicked: { addListener(listener: (tab: { id: number }) => void): void };
  };
  compose: {
    beginNew(details: ComposeDetails): Promise<unknown>;
  };
  tabs: {
    create(properties: { url: string }): Promise<unknown>;
  };
}

export interface ComposeDetails {
  to?: string;
  subject: string;
  plainTextBody: string;
  isPlainText: true;
  attachments?: { file: File; name: string }[];
}

export function createDraftOpener(api: Pick<ThunderbirdApi, 'compose'>, original: File): DraftOpener {
  return {
    async openDraft(draft: EmailDraft): Promise<void> {
      const details: ComposeDetails = {
        subject: draft.subject,
        plainTextBody: draft.body,
        isPlainText: true,
      };
      if (draft.to) details.to = draft.to;
      if (draft.attachOriginal) details.attachments = [{ file: original, name: 'original-email.eml' }];
      await api.compose.beginNew(details);
    },
  };
}

/** Opens the analysis page for the displayed email. Only a single email can be reported at a time. */
export async function openAnalysis(api: Pick<ThunderbirdApi, 'messageDisplay' | 'tabs'>, tabId: number): Promise<void> {
  const { messages } = await api.messageDisplay.getDisplayedMessages(tabId);
  const suffix = messages.length === 1 ? `id=${messages[0].id}` : 'error=selection';
  await api.tabs.create({ url: `page.html?${suffix}` });
}

export function getApi(): ThunderbirdApi {
  return (globalThis as unknown as { messenger: ThunderbirdApi }).messenger;
}

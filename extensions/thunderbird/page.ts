import '../../src/style.css';
import { setupControls } from '../../src/chrome';
import type { HeaderReport } from '../../src/core/headers';
import { MailReadError, readMail } from '../../src/core/readMail';
import { t } from '../../src/i18n';
import type { MailSource } from '../../src/reportView';
import { renderResult } from '../../src/resultView';
import { createDraftOpener, getApi } from './thunderbirdApi';

const error = document.querySelector<HTMLParagraphElement>('#error')!;
const result = document.querySelector<HTMLElement>('#result')!;

let shown: { report: HeaderReport; source: MailSource } | null = null;
let failure: (() => string) | null = null;

setupControls(() => {
  if (failure) showError(failure);
  if (shown) renderResult(result, shown.report, shown.source, { keepView: true });
});

function showError(message: () => string): void {
  failure = message;
  error.textContent = message();
  error.hidden = false;
}

async function start(): Promise<void> {
  const parameters = new URLSearchParams(location.search);
  const id = Number(parameters.get('id'));
  if (parameters.get('error') === 'selection' || !Number.isInteger(id) || id <= 0) {
    showError(() => t().selectOne);
    return;
  }

  const api = getApi();
  const file = await api.messages.getRaw(id, { data_format: 'File' });
  const data = await file.arrayBuffer();
  const fileName = 'message.eml';
  const source: MailSource = { fileName, data, drafts: createDraftOpener(api, file) };
  const report = await readMail(fileName, data);
  shown = { report, source };
  renderResult(result, report, source);
}

start().catch((cause) => {
  showError(() => (cause instanceof MailReadError ? t().errors[cause.code] : t().emailFailed));
});

import './style.css';
import { renderBatch, type BatchEntry } from './batchView';
import { setupControls } from './chrome';
import type { HeaderReport } from './core/headers';
import { MailReadError, readMail, readPastedText, textAsEml } from './core/readMail';
import { applyPageTitle, t } from './i18n';
import type { MailSource } from './reportView';
import { renderResult } from './resultView';

const dropzone = document.querySelector<HTMLLabelElement>('#dropzone')!;
const input = document.querySelector<HTMLInputElement>('#file')!;
const error = document.querySelector<HTMLParagraphElement>('#error')!;
const result = document.querySelector<HTMLElement>('#result')!;
const pasted = document.querySelector<HTMLTextAreaElement>('#pasted')!;
const pastedButton = document.querySelector<HTMLButtonElement>('#pasted-check')!;

// The emails are only kept in memory, so this limit keeps one check from filling it.
const MAX_BATCH = 200;

let shown: { report: HeaderReport; source: MailSource; backToList?: () => void } | null = null;
let batch: { entries: BatchEntry[]; skipped: number } | null = null;
// A newer file or text replaces a check that is still reading.
let currentRun = 0;

setupControls(() => {
  applyPageTitle();
  error.hidden = true;
  if (result.hidden) return;
  if (shown) renderResult(result, shown.report, shown.source, { keepView: true, backToList: shown.backToList });
  else if (batch) showBatch();
}, () => {
  // A new country changes the bodies in the report view. Whoever chose it there keeps the focus there.
  if (result.hidden || !shown) return;
  const fromReport = document.activeElement?.id === 'report-country';
  renderResult(result, shown.report, shown.source, { keepView: true, backToList: shown.backToList });
  if (fromReport) result.querySelector<HTMLElement>('#report-country')?.focus();
});
applyPageTitle();

function showError(message: string): void {
  result.hidden = true;
  error.textContent = message;
  error.hidden = false;
}

function show(report: HeaderReport, source: MailSource): void {
  shown = { report, source };
  renderResult(result, report, source);
}

function showBatch(): void {
  shown = null;
  renderBatch(result, batch!.entries, batch!.skipped, MAX_BATCH, (entry) => {
    if (!('report' in entry)) return;
    // Its own history entry, so that going back returns to the list.
    history.pushState(null, '', location.href);
    shown = { report: entry.report, source: entry.source, backToList: showBatch };
    renderResult(result, entry.report, entry.source, { backToList: showBatch });
  });
}

async function handleFiles(files: File[]): Promise<void> {
  if (files.length === 1) return handleFile(files[0]);
  const run = ++currentRun;
  error.hidden = true;
  shown = null;
  const progress = document.createElement('p');
  progress.setAttribute('role', 'status');
  result.replaceChildren(progress);
  result.hidden = false;
  const chosen = files.slice(0, MAX_BATCH);
  const entries: BatchEntry[] = [];
  for (const [index, file] of chosen.entries()) {
    progress.textContent = t().batch.reading(index + 1, chosen.length);
    try {
      const data = await file.arrayBuffer();
      entries.push({ fileName: file.name, report: await readMail(file.name, data), source: mailSource(file.name, data) });
    } catch (cause) {
      entries.push({ fileName: file.name, failure: () => (cause instanceof MailReadError ? t().errors[cause.code] : t().fileFailed) });
    }
    if (run !== currentRun) return;
  }
  batch = { entries, skipped: files.length - chosen.length };
  showBatch();
}

/** A saved source in a .txt file goes on to drafts and uploads as the .eml it is. */
function mailSource(fileName: string, data: ArrayBuffer): MailSource {
  return /\.txt$/i.test(fileName) ? { fileName: fileName.replace(/\.txt$/i, '.eml'), data: textAsEml(data) } : { fileName, data };
}

async function handleFile(file: File): Promise<void> {
  currentRun++;
  batch = null;
  error.hidden = true;
  result.hidden = true;
  try {
    const data = await file.arrayBuffer();
    show(await readMail(file.name, data), mailSource(file.name, data));
  } catch (cause) {
    showError(cause instanceof MailReadError ? t().errors[cause.code] : t().fileFailed);
  }
}

async function handlePasted(): Promise<void> {
  currentRun++;
  batch = null;
  error.hidden = true;
  result.hidden = true;
  try {
    const { report, data } = await readPastedText(pasted.value);
    show(report, { fileName: 'pasted.eml', data });
  } catch (cause) {
    showError(cause instanceof MailReadError ? t().errors[cause.code] : t().textFailed);
  }
}

pastedButton.addEventListener('click', () => void handlePasted());

input.addEventListener('change', () => {
  const files = [...(input.files ?? [])];
  if (files.length > 0) void handleFiles(files);
  input.value = '';
});

dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.classList.add('active');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('active'));
dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropzone.classList.remove('active');
  const files = [...(event.dataTransfer?.files ?? [])];
  if (files.length > 0) void handleFiles(files);
  else showError(t().noFileDropped);
});

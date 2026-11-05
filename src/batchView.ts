import { assess, type AssessmentLevel } from './core/assessment';
import { forReader } from './core/findings';
import type { HeaderReport } from './core/headers';
import { buildCsv } from './core/csv';
import { findingText, getLang, t } from './i18n';
import type { MailSource } from './reportView';
import { leaveResult } from './resultView';

export type BatchEntry =
  | { fileName: string; report: HeaderReport; source: MailSource }
  | { fileName: string; failure: () => string };

const LEVELS: AssessmentLevel[] = ['many-signs', 'some-signs', 'no-signs'];
// "No signs" stays neutral: it is not an all-clear.
const TONES: Record<AssessmentLevel, string> = { 'many-signs': 'bad', 'some-signs': 'warn', 'no-signs': 'neutral' };

// Email content comes from attackers: output via textContent only, never as HTML.
function el(tag: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function levelOf(entry: BatchEntry): number {
  return 'report' in entry ? LEVELS.indexOf(assess(forReader(entry.report.findings, getLang())).level) : LEVELS.length;
}

function saveCsv(entries: BatchEntry[]): void {
  const m = t();
  const rows = entries.map((entry) => {
    if (!('report' in entry)) return [m.batch.csvNotRead, '', '', entry.failure(), entry.fileName];
    const { from, subject } = entry.report;
    const findings = forReader(entry.report.findings, getLang());
    const reasons = assess(findings).reasons.map((finding) => findingText(finding).title);
    return [m.assessment[assess(findings).level].title, from ?? '', subject ?? '', [...new Set(reasons)].join(', '), entry.fileName];
  });
  const url = URL.createObjectURL(new Blob([buildCsv([m.batch.csvHeader, ...rows])], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'smt-watcher-list.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Lists the checked emails, those with the most signs first. Nothing here leaves the browser. */
export function renderBatch(result: HTMLElement, entries: BatchEntry[], skipped: number, limit: number, open: (entry: BatchEntry) => void): void {
  const m = t();
  const view = el('div');
  view.className = 'view';
  const title = el('h1', m.batch.title(entries.length));
  title.tabIndex = -1;
  view.append(title, el('p', m.batch.note));
  if (skipped > 0) view.append(el('p', m.batch.skipped(skipped, limit)));

  const list = el('ul');
  list.className = 'batch-list';
  const sorted = [...entries].sort((a, b) => levelOf(a) - levelOf(b));
  for (const entry of sorted) {
    const item = el('li');
    const mail = el('div');
    mail.className = 'batch-mail';
    if ('report' in entry) {
      const level = assess(forReader(entry.report.findings, getLang())).level;
      const badge = el('span', m.assessment[level].title);
      badge.className = `badge ${TONES[level]}`;
      const name = entry.report.subject || m.batch.noSubject;
      mail.append(el('strong', name), el('small', entry.report.from ?? entry.fileName));
      const button = el('button', m.batch.open) as HTMLButtonElement;
      button.type = 'button';
      button.className = 'btn btn-ghost';
      button.setAttribute('aria-label', m.batch.openLabel(name));
      button.addEventListener('click', () => open(entry));
      item.append(badge, mail, button);
    } else {
      mail.append(el('strong', entry.fileName), el('small', entry.failure()));
      item.append(mail);
    }
    list.append(item);
  }

  const another = el('button', m.anotherButton) as HTMLButtonElement;
  another.type = 'button';
  another.className = 'btn btn-ghost';
  another.addEventListener('click', () => leaveResult(result));
  const actions = el('div');
  actions.className = 'actions';
  const csv = el('button', m.batch.saveCsv) as HTMLButtonElement;
  csv.type = 'button';
  csv.className = 'btn btn-ghost';
  csv.addEventListener('click', () => saveCsv(sorted));
  actions.append(csv, another);
  view.append(list, actions, el('p', m.batch.saveCsvNote));

  window.onpopstate = null;
  document.body.dataset.view = 'assessment';
  result.replaceChildren(view);
  result.hidden = false;
  window.scrollTo(0, 0);
  title.focus({ preventScroll: true });
}

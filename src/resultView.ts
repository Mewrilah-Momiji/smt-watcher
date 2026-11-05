import { assess, rankFindings, type AssessmentLevel } from './core/assessment';
import { buildContribution, isWrongAssessment, sendContribution, SENDER_DB_ENABLED, verdictForWrongAssessment, type Contribution, type Verdict } from './core/contribution';
import { forReader, type Finding } from './core/findings';
import type { HeaderReport } from './core/headers';
import { ADVICE_SOURCES, BLOCKLIST_PAGES, hasUnsubscribeHeader, type AdviceSource } from './core/senderAdvice';
import { findSenderOrigin } from './core/senderOrigin';
import { findingText, getLang, t } from './i18n';
import { lookupDomain, lookupFinding, lookUpSender } from './core/senderLookup';
import { externalLink, renderReportSection, type MailSource } from './reportView';

// Email content comes from attackers: output via textContent only, never as HTML.
function el(tag: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function authStatus(result: string | undefined): { label: string; tone: string } {
  const labels = t().auth;
  switch (result) {
    case undefined:
      return { label: labels.noResult, tone: 'neutral' };
    case 'pass':
    case 'bestguesspass':
      return { label: labels.pass, tone: 'ok' };
    case 'fail':
    case 'hardfail':
      return { label: labels.fail, tone: 'bad' };
    case 'softfail':
      return { label: labels.softfail, tone: 'warn' };
    case 'none':
      return { label: labels.none, tone: 'neutral' };
    default:
      return { label: result, tone: 'neutral' };
  }
}

function riskScale(level: AssessmentLevel): HTMLElement {
  const m = t().scale;
  const steps: [string, string, AssessmentLevel][] = [
    ['high', m.high, 'many-signs'],
    ['medium', m.medium, 'some-signs'],
    ['low', m.low, 'no-signs'],
  ];
  const scale = el('ol');
  scale.className = 'scale';
  scale.setAttribute('aria-label', m.label);
  for (const [name, label, stepLevel] of steps) {
    const step = el('li', label);
    step.className = stepLevel === level ? `${name} active` : name;
    if (stepLevel === level) step.setAttribute('aria-current', 'true');
    scale.append(step);
  }
  return scale;
}

function findingList(findings: Finding[]): HTMLElement {
  const issues = el('ul');
  issues.className = 'issues';
  for (const finding of findings) {
    const item = el('li');
    item.className = finding.severity;
    const text = findingText(finding);
    item.append(el('strong', text.title), el('span', text.detail));
    issues.append(item);
  }
  return issues;
}

const fill = (text: string, values: Record<string, string>): string => text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');

/** What leaves the browser, in words. It names the kinds of signs, not the codes. */
function contributionSummary(contribution: Contribution): string[] {
  const m = t().contribute.summary;
  return [
    fill(m.sender, { domain: contribution.senderDomain }),
    fill(m.result, { level: t().assessment[contribution.level].title }),
    contribution.linkDomains.length > 0 ? fill(m.links, { domains: contribution.linkDomains.join(', ') }) : m.noLinks,
    fill(m.answer, { answer: t().contribute.verdicts[contribution.verdict] }) + (contribution.assessmentWrong ? ` ${m.wrong}` : ''),
    m.notSent,
    m.ip,
  ];
}

/** Nothing is sent until the user reads what would be sent and clicks. */
function contributionFold(report: HeaderReport, level: AssessmentLevel): { fold: HTMLElement; reportWrong: () => void } | null {
  if (!SENDER_DB_ENABLED) return null;
  const m = t().contribute;
  let wrong = false;
  const fold = el('details') as HTMLDetailsElement;
  fold.className = 'fold';
  const status = el('p');
  status.setAttribute('role', 'status');

  // In words, as the privacy policy describes. How the data is built is in the public source code.
  const summary = el('ul');
  summary.className = 'contribution-summary';
  const radios = new Map<Verdict, HTMLInputElement>();
  const group = el('fieldset');
  group.append(el('legend', m.question));
  const send = el('button', m.send) as HTMLButtonElement;
  send.type = 'button';
  send.className = 'btn';
  send.disabled = true;

  const chosen = (): Verdict | null => [...radios].find(([, radio]) => radio.checked)?.[0] ?? null;
  const refresh = (): void => {
    const verdict = chosen();
    const contribution = verdict && buildContribution(report, verdict, isWrongAssessment(level, verdict, wrong));
    summary.replaceChildren(...(contribution ? contributionSummary(contribution) : [m.choose]).map((line) => el('li', line)));
    send.disabled = !contribution;
  };
  for (const verdict of ['spam', 'legit', 'unsure'] as const) {
    const label = el('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'contribution-verdict';
    radio.addEventListener('change', refresh);
    radios.set(verdict, radio);
    label.append(radio, ` ${m.verdicts[verdict]}`);
    group.append(label);
  }
  send.addEventListener('click', () => {
    const verdict = chosen();
    const contribution = verdict && buildContribution(report, verdict, isWrongAssessment(level, verdict, wrong));
    if (!contribution) return;
    send.disabled = true;
    status.textContent = m.sending;
    void sendContribution(contribution).then(
      (ok) => {
        status.textContent = ok ? m.sent : m.failed;
        send.disabled = ok;
      },
      () => {
        status.textContent = m.failed;
        send.disabled = false;
      },
    );
  });

  if (!buildContribution(report, 'unsure')) {
    fold.append(el('summary', m.title), el('p', m.notUsable));
    return { fold, reportWrong: () => { fold.open = true; } };
  }
  fold.append(el('summary', m.title), el('p', m.intro), group, el('h3', m.previewTitle), summary, el('p', m.consent), send, status);
  refresh();
  return {
    fold,
    reportWrong: () => {
      wrong = true;
      const opposite = verdictForWrongAssessment(level);
      if (opposite) radios.get(opposite)!.checked = true;
      refresh();
      fold.open = true;
      fold.scrollIntoView();
    },
  };
}

// Remembered per email, so that a language change neither loses the answer nor asks again.
const lookups = new WeakMap<HeaderReport, 'found' | 'none'>();

/** Only a click sends the domain. A finding joins the report, which then shows and counts it like any other. */
function senderLookup(report: HeaderReport, rerender: () => void): HTMLElement | null {
  if (!SENDER_DB_ENABLED) return null;
  const m = t().lookup;
  const wrapper = el('div');
  wrapper.className = 'sender-lookup';
  const domain = lookupDomain(report);
  const done = lookups.get(report);
  if (done === 'found') return null;
  if (done === 'none') {
    wrapper.append(el('p', m.none));
    return wrapper;
  }
  if (!domain) {
    wrapper.append(el('p', m.notUsable));
    return wrapper;
  }
  const button = el('button', m.button) as HTMLButtonElement;
  button.type = 'button';
  const status = el('p');
  status.setAttribute('role', 'status');
  button.addEventListener('click', () => {
    button.disabled = true;
    status.textContent = m.searching;
    void lookUpSender(domain).then(
      (result) => {
        const finding = lookupFinding(report, result);
        if (finding) report.findings.push(finding);
        lookups.set(report, finding ? 'found' : 'none');
        rerender();
      },
      () => {
        button.disabled = false;
        status.textContent = m.failed;
      },
    );
  });
  wrapper.append(el('p', m.consent), button, status);
  return wrapper;
}

/** General tips for senders, the same for every email. */
function senderAdviceFold(): HTMLElement {
  const m = t().senderAdvice;
  const fold = el('details');
  fold.className = 'fold';
  const tips = el('ul');
  for (const tip of m.tips) tips.append(el('li', tip));
  fold.append(el('summary', m.title), el('p', m.intro), tips);
  return fold;
}

function adviceLinks(sources: AdviceSource[]): HTMLElement {
  const m = t().senderAdvice;
  const links = el('ul');
  links.className = 'advice-links';
  links.setAttribute('aria-label', t().blocklistsTitle);
  for (const source of sources) {
    const item = el('li');
    item.append(externalLink(m.links[source], ADVICE_SOURCES[source]));
    links.append(item);
  }
  return links;
}

const VISIBLE_FINDINGS = 3;

/** Closes the result and goes back to choosing an email. */
export function leaveResult(result: HTMLElement): void {
  window.onpopstate = null;
  delete document.body.dataset.view;
  result.hidden = true;
  result.replaceChildren();
  window.scrollTo(0, 0);
  document.querySelector<HTMLElement>('#file')?.focus({ preventScroll: true });
}

export function renderResult(result: HTMLElement, report: HeaderReport, source: MailSource, options: { keepView?: boolean; backToList?: () => void } = {}): void {
  const m = t();
  const fields: [string, string | null][] = [
    [m.fields.subject, report.subject],
    [m.fields.from, report.from],
    [m.fields.to, report.to],
    [m.fields.date, report.date],
    ['Return-Path', report.returnPath],
    ['Reply-To', report.replyTo],
    ['Message-ID', report.messageId],
  ];

  const list = el('dl');
  for (const [label, value] of fields) {
    list.append(el('dt', label), el('dd', value ?? m.notPresent));
  }

  const route = el('ol');
  for (const hop of report.received) {
    const item = el('li');
    item.append(
      el('strong', hop.by ?? m.unknownServer),
      el('span', `${m.hopFrom} ${hop.from ?? m.unknown}${hop.ip ? ` (${hop.ip})` : ''}`),
      el('small', hop.date ?? m.noTimestamp),
    );
    route.append(item);
  }

  const checks = el('ul');
  checks.className = 'checks';
  for (const method of ['spf', 'dkim', 'dmarc'] as const) {
    const entry = report.authentication[method];
    const status = authStatus(entry?.result);
    const item = el('li');
    const badge = el('span', status.label);
    badge.className = `badge ${status.tone}`;
    item.append(
      el('strong', method.toUpperCase()),
      badge,
      el('small', entry ? [entry.domain, m.authSource[entry.source]].filter(Boolean).join(' · ') : m.notRecorded),
    );
    checks.append(item);
  }

  const signals = report.providerSignals.map((signal) => el('p', `${signal.name}: ${signal.value}`));

  // The lookup adds to the report itself, so only the views below see the findings as this reader would.
  const readerReport = { ...report, findings: forReader(report.findings, getLang()) };
  const ranked = rankFindings(readerReport.findings);
  const assessment = assess(readerReport.findings);
  const verdict = el('div');
  verdict.className = `assessment ${assessment.level}`;
  verdict.append(el('h1', m.assessment[assessment.level].title), el('p', m.assessment[assessment.level].detail));
  if (assessment.phishingSigns) {
    verdict.append(el('p', m.fraudWarning));
  }
  if (!report.bodyText && !report.hasHtml) {
    verdict.append(el('p', m.headersOnly));
  }
  if (assessment.level === 'no-signs' && hasUnsubscribeHeader(report.rawHeaders)) {
    verdict.append(el('p', m.newsletterNote));
  }

  const technical = el('details');
  technical.className = 'fold';
  technical.append(
    el('summary', m.technical),
    ...(report.bodyText && !report.hasHtml ? [el('p', m.noHtml)] : []),
    el('h3', m.senderChecks),
    checks,
    el('p', m.senderChecksNote),
    ...(signals.length > 0 ? [el('h3', m.otherHeaders), el('p', m.otherHeadersNote), ...signals] : []),
    el('h3', m.emailDetails),
    list,
    el('h3', m.route(report.received.length)),
    el('p', m.routeNote),
    route,
  );
  const origin = findSenderOrigin(report.received);
  if (origin) technical.append(el('h3', m.blocklistsTitle), el('p', m.blocklistsNote(origin.ip)), adviceLinks(BLOCKLIST_PAGES));

  const reportButton = el('button', m.reportButton) as HTMLButtonElement;
  reportButton.type = 'button';
  reportButton.className = 'btn';

  const actions = el('div');
  actions.className = 'actions';
  actions.append(reportButton);

  // Both views live on one page: a real page change would lose the email, which is kept only in memory.
  const assessmentView = el('div');
  assessmentView.className = 'view';
  assessmentView.append(riskScale(assessment.level), verdict);
  if (ranked.length > 0) assessmentView.append(findingList(ranked.slice(0, VISIBLE_FINDINGS)));
  assessmentView.append(actions);
  if (ranked.length > VISIBLE_FINDINGS) {
    const more = el('details');
    more.className = 'fold';
    more.append(el('summary', m.allFindings(ranked.length)), findingList(ranked.slice(VISIBLE_FINDINGS)));
    assessmentView.append(more);
  }
  const lookup = senderLookup(report, () => {
    renderResult(result, report, source, { ...options, keepView: true });
    result.querySelector<HTMLElement>('.view:not([hidden]) h1')?.focus({ preventScroll: true });
  });
  if (lookup) assessmentView.append(lookup);
  const contribution = contributionFold(readerReport, assessment.level);
  if (contribution) {
    const reportWrong = el('button', m.contribute.reportWrong) as HTMLButtonElement;
    reportWrong.type = 'button';
    reportWrong.className = 'btn btn-ghost';
    reportWrong.addEventListener('click', contribution.reportWrong);
    actions.append(reportWrong);
    assessmentView.append(contribution.fold);
  }
  assessmentView.append(senderAdviceFold(), technical);

  const back = el('button', m.backButton) as HTMLButtonElement;
  back.type = 'button';
  back.className = 'back';
  const reportView = el('div');
  reportView.className = 'view';
  reportView.append(back, renderReportSection(report, source));

  const show = (view: 'assessment' | 'report', moveFocus = true): void => {
    assessmentView.hidden = view !== 'assessment';
    reportView.hidden = view !== 'report';
    document.body.dataset.view = view;
    window.scrollTo(0, 0);
    // The content changes without a page load, so screen readers and keyboards need to be taken along.
    if (moveFocus) (view === 'assessment' ? assessmentView : reportView).querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  };

  reportButton.addEventListener('click', () => {
    history.pushState(null, '', '#report');
    show('report');
  });
  back.addEventListener('click', () => history.back());
  window.onpopstate = () => {
    const target = location.hash === '#report' ? 'report' : 'assessment';
    // Going back from an email that was opened from a list leads to that list.
    if (options.backToList && target === 'assessment' && !assessmentView.hidden) options.backToList();
    else show(target);
  };

  if (options.backToList) {
    const toList = el('button', m.batch.backToList) as HTMLButtonElement;
    toList.type = 'button';
    toList.className = 'btn btn-ghost';
    toList.addEventListener('click', () => history.back());
    actions.append(toList);
  } else if (!source.drafts) {
    // A mail program extension always works on the email that is open there.
    const another = el('button', m.anotherButton) as HTMLButtonElement;
    another.type = 'button';
    another.className = 'btn btn-ghost';
    another.addEventListener('click', () => leaveResult(result));
    actions.append(another);
  }

  if (!options.keepView) history.replaceState(null, '', location.pathname + location.search);
  result.replaceChildren(assessmentView, reportView);
  result.hidden = false;
  result.querySelectorAll('h1').forEach((heading) => { heading.tabIndex = -1; });
  // A language change keeps the focus on the language button.
  show(options.keepView && location.hash === '#report' ? 'report' : 'assessment', !options.keepView);
}

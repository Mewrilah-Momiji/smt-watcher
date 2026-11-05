import { lookUpAbuseContact, rdapUrl, type AbuseContact } from './core/abuseContact';
import type { HeaderReport } from './core/headers';
import { findPhoneCandidates, parsePhoneInput } from './core/phones';
import { buildAbuseReport, buildEmailReport, buildFormValues, needsConsentStatement, suggestBodies, type EmailReport, type ReportInput } from './core/reporting';
import { findSenderOrigin } from './core/senderOrigin';
import { createCountryPicker } from './chrome';
import { getCountryCode } from './countryPreference';
import { COUNTRIES, localized, OTHER_COUNTRY, type ReportCase, type ReportingBody } from './data/reportingBodies';
import { getLang, t } from './i18n';

const CASES: ReportCase[] = ['advertising', 'illegal-content', 'phishing'];

function el(tag: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

export function copyField(label: string, value: string): HTMLElement {
  const wrapper = el('div');
  wrapper.className = 'copy-field';

  const area = document.createElement('textarea');
  area.readOnly = true;
  area.value = value;
  area.rows = Math.min(5, value.split('\n').length);
  area.setAttribute('aria-label', label);

  const button = el('button', t().copy) as HTMLButtonElement;
  button.type = 'button';
  button.addEventListener('click', () => {
    void navigator.clipboard.writeText(value).then(
      () => { button.textContent = t().copied; },
      () => { area.select(); button.textContent = t().pressCtrlC; },
    );
  });

  wrapper.append(el('strong', label), area, button);
  return wrapper;
}

export interface EmailDraft {
  to: string | null;
  subject: string;
  body: string;
  attachOriginal: boolean;
}

/** Offered by mail program extensions. It only opens a draft: the user reviews and sends it. */
export interface DraftOpener {
  openDraft(draft: EmailDraft): Promise<void>;
}

export interface MailSource {
  fileName: string;
  data: ArrayBuffer;
  drafts?: DraftOpener;
}

function draftButton(drafts: DraftOpener, draft: EmailDraft): HTMLElement {
  const wrapper = el('div');
  wrapper.className = 'eml-download';
  const button = el('button', t().openDraft) as HTMLButtonElement;
  button.type = 'button';
  const status = el('p', draft.attachOriginal ? t().draftAttached : t().draftNotAttached);
  button.addEventListener('click', () => {
    void drafts.openDraft(draft).catch(() => {
      status.textContent = t().draftFailed;
    });
  });
  wrapper.append(button, status);
  return wrapper;
}

/** The upload needs .eml, so this offers a reconstruction. The file stays on the user's computer. */
function renderEmlDownload(source: MailSource, limitBytes: number): HTMLElement {
  const wrapper = el('div');
  wrapper.className = 'eml-download';
  const button = el('button', t().saveEml) as HTMLButtonElement;
  button.type = 'button';
  const status = el('p', t().saveEmlNote);
  button.addEventListener('click', async () => {
    let result;
    try {
      const { msgToEml } = await import('./core/msgToEml');
      result = msgToEml(source.data);
    } catch {
      status.textContent = t().convertFailed;
      return;
    }
    const blob = new Blob([result.eml], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'email.eml';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);

    const notes = [t().saved];
    if (result.skippedAttachments > 0) notes.push(t().skipped(result.skippedAttachments));
    if (blob.size > limitBytes) notes.push(t().tooLarge);
    status.textContent = notes.join(' ');
  });
  wrapper.append(button, status);
  return wrapper;
}

export function externalLink(text: string, url: string): HTMLElement {
  const link = el('a', text) as HTMLAnchorElement;
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function checkbox(label: string, checked: boolean, onChange: (checked: boolean) => void): HTMLElement {
  const wrapper = el('label');
  wrapper.className = 'consent';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = checked;
  box.addEventListener('change', () => onChange(box.checked));
  wrapper.append(box, ` ${label}`);
  return wrapper;
}

function formFields(body: ReportingBody, input: ReportInput, url: string): HTMLElement[] {
  const m = t();
  const values = buildFormValues(input, body.language);
  return [
    ...values.phones.map((phone) => copyField(m.phone, phone)),
    copyField(m.receivedAt, values.receivedAt),
    copyField(m.notes, values.notes),
    externalLink(m.openForm, url),
  ];
}

/** The form takes one number per report, so each number gets its own step with its own text. */
function formSteps(body: ReportingBody, input: ReportInput, url: string, sentNumbers: Set<string>, onReported: (reported: boolean) => void): HTMLElement[] {
  const m = t();
  const count = input.phones.length;
  const firstOpen = Math.max(0, input.phones.findIndex((phone) => !sentNumbers.has(phone)));
  const steps = input.phones.map((phone, index) => {
    const title = m.reportStep(index + 1, count, phone);
    const summary = el('summary', sentNumbers.has(phone) ? `${title} ✓` : title);
    const step = el('details') as HTMLDetailsElement;
    step.className = 'fold step';
    step.setAttribute('name', 'report-step');
    step.open = index === firstOpen;
    step.append(
      summary,
      ...formFields(body, { ...input, phones: [phone] }, url),
      checkbox(m.sent, sentNumbers.has(phone), (sent) => {
        if (sent) sentNumbers.add(phone);
        else sentNumbers.delete(phone);
        summary.textContent = sent ? `${title} ✓` : title;
        onReported(input.phones.some((number) => sentNumbers.has(number)));
        const next = input.phones.findIndex((number) => !sentNumbers.has(number));
        if (sent && next !== -1) (steps[next] as HTMLDetailsElement).open = true;
      }),
    );
    return step;
  });
  return [el('p', m.onePerReport(count)), ...steps];
}

function renderBody(body: ReportingBody, input: ReportInput, source: MailSource, isReported: boolean, sentNumbers: Set<string>, onReported: (reported: boolean) => void): HTMLElement {
  const m = t();
  const lang = getLang();
  const card = el('article');
  card.className = 'body-card';
  card.append(el('p', localized(body.purpose, lang)));

  const notices = el('div');
  notices.className = 'notices';
  const noticeList = el('ul');
  noticeList.append(...localized(body.notices, lang).map((notice) => el('li', notice)));
  notices.append(el('strong', m.beforeSend), noticeList);
  const usesDraft = source.drafts && body.channel.type === 'email';
  card.append(notices, el('p', usesDraft ? m.useDraft : localized(body.instructions, lang)));

  const usesSteps = body.channel.type === 'form' && body.requiresPhone && input.phones.length > 1;
  if (body.channel.type === 'form') {
    card.append(
      ...(usesSteps
        ? formSteps(body, input, body.channel.url, sentNumbers, onReported)
        : formFields(body, input, body.channel.url)),
    );
  } else {
    const email = buildEmailReport(input, body.language, body.wantsHeaders);
    const mailto = el('a', m.writeTo(body.channel.address)) as HTMLAnchorElement;
    mailto.href = `mailto:${body.channel.address}?subject=${encodeURIComponent(email.subject)}`;
    card.append(
      copyField(m.subject, email.subject),
      copyField(m.emailText, email.body),
      source.drafts
        ? draftButton(source.drafts, { to: body.channel.address, subject: email.subject, body: email.body, attachOriginal: true })
        : mailto,
    );
  }

  if (body.emlUploadLimitBytes !== undefined && source.fileName.toLowerCase().endsWith('.msg')) {
    card.append(renderEmlDownload(source, body.emlUploadLimitBytes));
  }

  const credit = el('small');
  credit.append(`${m.checked(body.checkedAt)} `, externalLink(m.static.source, body.source));
  if (!usesSteps) card.append(checkbox(m.sent, isReported, onReported));
  card.append(credit);
  return card;
}

type AbuseLookup = { state: 'idle' } | { state: 'searching' } | { state: 'failed' } | { state: 'done'; contact: AbuseContact };

interface ReportState {
  countryCode: string;
  selected: Set<string>;
  addedPhones: string[];
  phoneDraft: string;
  reportCase: ReportCase | null;
  noConsent: boolean;
  reported: Set<string>;
  sentNumbers: Set<string>;
  hadPhone: boolean;
  /** `show` belongs to the latest view, as a lookup can finish after the view was rebuilt. */
  abuseLookup: { current: AbuseLookup; show?: (lookup: AbuseLookup) => void };
  openCard: string | null;
  /** The country and case for which the abuse contact was last opened by itself. */
  abuseOpenedFor?: string;
}

// Kept per email, so that a language change keeps the entries and a new email starts empty.
const reportStates = new WeakMap<HeaderReport, ReportState>();

function reportStateFor(report: HeaderReport): ReportState {
  let state = reportStates.get(report);
  if (!state) {
    // Nothing is preselected: signatures of legitimate senders contain phone numbers too.
    state = { countryCode: getCountryCode(), selected: new Set(), addedPhones: [], phoneDraft: '', reportCase: null, noConsent: false, reported: new Set(), sentNumbers: new Set(), hadPhone: false, abuseLookup: { current: { state: 'idle' } }, openCard: null };
    reportStates.set(report, state);
  }
  return state;
}

/** The answer comes from outside the page, so it is shown as text only. */
function renderAbuseLookup(lookup: AbuseLookup, email: EmailReport, source: MailSource, start: () => void): HTMLElement {
  const m = t();
  const wrapper = el('div');
  wrapper.className = 'abuse-lookup';
  wrapper.setAttribute('aria-live', 'polite');

  if (lookup.state === 'idle' || lookup.state === 'searching') {
    const button = el('button', lookup.state === 'idle' ? m.abuseFind : m.abuseSearching) as HTMLButtonElement;
    button.type = 'button';
    button.className = 'btn';
    button.disabled = lookup.state === 'searching';
    button.addEventListener('click', start);
    // The click counts as consent, so what it sends must be clear right before it.
    wrapper.append(el('p', m.abuseConsent), button);
  } else if (lookup.state === 'failed') {
    wrapper.append(el('p', m.abuseLookupFailed));
  } else if (lookup.contact.addresses.length === 0) {
    wrapper.append(el('p', m.abuseNoAddress));
  } else {
    wrapper.append(el('p', lookup.contact.networkContact ? m.abuseNetworkContactFound(lookup.contact.registry) : m.abuseFound(lookup.contact.registry)));
    for (const address of lookup.contact.addresses) {
      wrapper.append(copyField(lookup.contact.networkContact ? m.abuseNetworkContact : m.abuseAddress, address));
      if (source.drafts) {
        wrapper.append(draftButton(source.drafts, { to: address, subject: email.subject, body: email.body, attachOriginal: false }));
      } else {
        const mailto = el('a', m.writeTo(address)) as HTMLAnchorElement;
        mailto.href = `mailto:${encodeURIComponent(address)}?subject=${encodeURIComponent(email.subject)}`;
        wrapper.append(mailto);
      }
    }
    return wrapper;
  }
  // Without a found address, the draft stays open for one the user looks up.
  if (source.drafts) wrapper.append(draftButton(source.drafts, { to: null, subject: email.subject, body: email.body, attachOriginal: false }));
  return wrapper;
}

/** Offers the sending network's abuse contact. The lookup only runs when the user starts it. */
function renderAbuseCard(report: HeaderReport, reportedTo: string[], source: MailSource, lookupState: ReportState['abuseLookup']): HTMLElement | null {
  const origin = findSenderOrigin(report.received);
  if (!origin) return null;

  const m = t();
  const card = el('article');
  card.className = 'body-card';
  const email = buildAbuseReport(report, origin, reportedTo);

  const notices = el('div');
  notices.className = 'notices';
  const noticeList = el('ul');
  noticeList.append(...[reportedTo.length > 0 ? m.abuseReported : m.abuseNotReported, ...m.abuseNotices].map((notice) => el('li', notice)));
  notices.append(el('strong', m.beforeSend), noticeList);

  const lookupSlot = el('div');
  const showLookup = (lookup: AbuseLookup): void => {
    lookupState.current = lookup;
    lookupSlot.replaceChildren(renderAbuseLookup(lookup, email, source, () => {
      showLookup({ state: 'searching' });
      void lookUpAbuseContact(origin.ip).then(
        (contact) => lookupState.show?.({ state: 'done', contact }),
        () => lookupState.show?.({ state: 'failed' }),
      );
    }));
  };
  lookupState.show = showLookup;
  showLookup(lookupState.current);

  card.append(
    el('p', m.abuseIntro(origin.ip, origin.claimedName)),
    notices,
    el('p', m.abuseHowTo),
    lookupSlot,
    externalLink(m.abuseLookup, rdapUrl(origin.ip)),
    copyField(m.subject, email.subject),
    copyField(m.emailText, email.body),
  );
  return card;
}

/** Builds the reporting section. Nothing is sent: the user reviews and submits everything. */
export function renderReportSection(report: HeaderReport, source: MailSource): HTMLElement {
  const m = t();
  const section = el('section');
  section.className = 'report';
  const state = reportStateFor(report);
  // The bodies differ, so nothing that was open or marked for another country carries over.
  if (state.countryCode !== getCountryCode()) {
    state.countryCode = getCountryCode();
    state.openCard = null;
    state.hadPhone = false;
    state.sentNumbers.clear();
    state.reported.clear();
  }
  const country = COUNTRIES.find((entry) => entry.code === state.countryCode) ?? COUNTRIES[0];
  const countryName = m.country[country.code];

  const candidates = report.bodyText ? findPhoneCandidates(report.bodyText, country.code) : [];
  const { selected, reported, sentNumbers, abuseLookup } = state;

  const output = el('div');
  output.setAttribute('aria-live', 'polite');
  const abuseSlot = el('div');

  const accordion = (id: string, title: string, content: HTMLElement): HTMLElement => {
    const item = el('details') as HTMLDetailsElement;
    item.className = 'fold recipient';
    item.setAttribute('name', 'report-recipient');
    // Only one recipient is open at a time, which keeps this view short.
    item.open = state.openCard === id;
    item.addEventListener('toggle', () => {
      if (item.open) state.openCard = id;
      else if (state.openCard === id) state.openCard = null;
    });
    item.append(el('summary', title), content);
    return item;
  };

  const needsMoreInput = () => !state.reportCase || (needsConsentStatement(state.reportCase) && !state.noConsent);

  const updateAbuse = () => {
    abuseSlot.replaceChildren();
    if (needsMoreInput()) return;
    const current = state.reportCase ? suggestBodies(country, state.reportCase, selected.size > 0).bodies : [];
    const reportedTo = current.filter((body) => reported.has(body.id)).map((body) => body.internationalName);
    const card = renderAbuseCard(report, reportedTo, source, abuseLookup);
    if (card) abuseSlot.append(accordion('abuse', m.abuseTitle, card));
  };

  const update = () => {
    const { reportCase } = state;
    const isPhishing = reportCase === 'phishing';
    const phoneBody = reportCase ? suggestBodies(country, reportCase, true).bodies.find((body) => body.requiresPhone) : undefined;
    phoneGroup.hidden = !phoneBody;
    if (phoneBody) phoneWhy.textContent = selected.size > 0 ? m.phoneWhyIncluded(phoneBody.name) : m.phoneWhyMissing(phoneBody.name);
    consent.hidden = !reportCase || isPhishing;

    const available = reportCase ? suggestBodies(country, reportCase, selected.size > 0).bodies : [];
    if (!available.some((body) => body.id === state.openCard) && state.openCard !== 'abuse') state.openCard = available[0]?.id ?? null;
    // Without a checked body, the abuse contact is all that is left, so open it, but only once per country and case.
    const context = `${country.code}:${reportCase}`;
    if (reportCase && available.length === 0 && state.abuseOpenedFor !== context) {
      state.openCard = 'abuse';
      state.abuseOpenedFor = context;
    }
    // Choosing the first number is what the user does to reach this body, so show it.
    if (phoneBody && selected.size > 0 && !state.hadPhone) state.openCard = phoneBody.id;
    state.hadPhone = selected.size > 0;

    updateAbuse();
    output.replaceChildren();
    if (!reportCase) return;

    const suggestion = suggestBodies(country, reportCase, selected.size > 0);
    if (suggestion.unchecked) {
      output.append(el('p', country.code === OTHER_COUNTRY ? m.notCheckedOther : m.notChecked(countryName)));
      const note = country.uncheckedNotes?.[reportCase];
      if (note) output.append(Object.assign(el('p', localized(note, getLang())), { className: 'hint' }));
    }
    if (suggestion.bodies.length === 0) return;
    if (needsMoreInput()) return;

    const input: ReportInput = { report, phones: [...selected], reportCase };
    output.append(
      ...suggestion.bodies.map((body) =>
        accordion(
          body.id,
          body.name,
          renderBody(body, input, source, reported.has(body.id), sentNumbers, (isReported) => {
            if (isReported) reported.add(body.id);
            else reported.delete(body.id);
            updateAbuse();
          }),
        ),
      ),
    );
  };

  const phoneGroup = el('fieldset');
  phoneGroup.append(el('legend', m.phoneQuestion));
  const phoneBoxes = new Map<string, HTMLInputElement>();
  const phoneList = el('div');
  const addPhoneOption = (text: string, normalized: string): void => {
    const label = el('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = selected.has(normalized);
    box.addEventListener('change', () => {
      if (box.checked) selected.add(normalized);
      else selected.delete(normalized);
      update();
    });
    label.append(box, ` ${text}`);
    phoneBoxes.set(normalized, box);
    phoneList.append(label);
  };
  for (const candidate of candidates) {
    addPhoneOption(`${candidate.raw} (${candidate.normalized})`, candidate.normalized);
  }

  for (const added of state.addedPhones) addPhoneOption(added, added);

  const phoneInput = document.createElement('input');
  phoneInput.type = 'tel';
  phoneInput.autocomplete = 'off';
  phoneInput.value = state.phoneDraft;
  phoneInput.addEventListener('input', () => {
    state.phoneDraft = phoneInput.value;
  });
  const phoneError = el('p', m.phoneInvalid);
  phoneError.className = 'phone-error';
  phoneError.setAttribute('role', 'alert');
  phoneError.hidden = true;
  const addPhone = (): void => {
    const normalized = parsePhoneInput(phoneInput.value, country.code);
    phoneError.hidden = normalized !== null;
    if (!normalized) return;
    if (!phoneBoxes.has(normalized)) {
      state.addedPhones.push(normalized);
      addPhoneOption(normalized, normalized);
    }
    const box = phoneBoxes.get(normalized)!;
    box.checked = true;
    selected.add(normalized);
    phoneInput.value = '';
    state.phoneDraft = '';
    update();
  };
  phoneInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addPhone();
  });
  const phoneAdd = el('button', m.phoneAdd) as HTMLButtonElement;
  phoneAdd.type = 'button';
  phoneAdd.addEventListener('click', addPhone);

  const phoneEntry = el('label');
  phoneEntry.className = 'phone-entry';
  phoneEntry.append(el('span', m.phoneEntry), phoneInput);
  const phoneWhy = el('p');
  phoneWhy.className = 'phone-why';

  if (candidates.length > 0) phoneGroup.append(phoneList, el('small', m.phoneHint));
  else phoneGroup.append(phoneList);
  phoneGroup.append(phoneEntry, phoneAdd, el('small', m.phoneEntryHint), phoneError, phoneWhy);

  const caseGroup = el('fieldset');
  caseGroup.append(el('legend', m.caseQuestion));
  for (const value of CASES) {
    const label = el('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'report-case';
    radio.value = value;
    radio.checked = state.reportCase === value;
    radio.addEventListener('change', () => {
      state.reportCase = value;
      update();
    });
    label.append(radio, ` ${m.cases[value]}`);
    caseGroup.append(label);
  }

  const consent = el('label');
  consent.className = 'consent';
  const consentBox = document.createElement('input');
  consentBox.type = 'checkbox';
  consentBox.checked = state.noConsent;
  consentBox.addEventListener('change', () => {
    state.noConsent = consentBox.checked;
    update();
  });
  consent.append(consentBox, ` ${m.consent}`);

  // The same choice as in the header: changing it here changes it there, and the page shows the new country's bodies.
  const countryPicker = createCountryPicker();
  countryPicker.input.id = 'report-country';
  const countryLabel = el('label', m.reportCountry) as HTMLLabelElement;
  countryLabel.htmlFor = countryPicker.input.id;
  countryLabel.className = 'report-country';
  countryLabel.append(...countryPicker.elements);

  section.append(
    el('h1', m.reportTitle),
    countryLabel,
    el('p', country.code === OTHER_COUNTRY
      ? m.reportIntroOther
      : country.language === 'en' ? m.reportIntroEnglish(countryName) : m.reportIntro(countryName, m.reportLanguages[country.language])),
    // Nobody should take the page for a body or think a body stands behind it.
    Object.assign(el('p', m.independent), { className: 'hint' }),
    caseGroup,
    phoneGroup,
    consent,
    output,
    abuseSlot,
  );
  update();
  return section;
}

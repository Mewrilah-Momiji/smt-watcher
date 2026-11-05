import './style.css';
import { setupControls } from './chrome';
import { SENDER_DB_ENABLED } from './core/contribution';
import { getLang, t } from './i18n';

// The operator's details are settings in .env.local, so that a copy of the code does not carry them. The build checks that they are set.
const NAME = import.meta.env.VITE_OPERATOR_NAME ?? '';
const OPERATOR = [NAME, import.meta.env.VITE_OPERATOR_STREET ?? '', import.meta.env.VITE_OPERATOR_CITY ?? ''];
const EMAIL = import.meta.env.VITE_OPERATOR_EMAIL ?? '';
// Tells the server how long filling in took, which stops simple bots.
const STARTED = String(Math.floor(Date.now() / 1000));
const STATUSES = ['sent', 'invalid', 'busy', 'failed'] as const;

function el(tag: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function contact(): HTMLElement {
  const address = el('address');
  for (const line of OPERATOR) address.append(line, el('br'));
  const mail = el('a', EMAIL) as HTMLAnchorElement;
  mail.href = `mailto:${EMAIL}`;
  address.append(mail);
  return address;
}

function formField(label: string, control: HTMLInputElement | HTMLTextAreaElement, name: string, draft: FormData | null): HTMLElement {
  control.name = name;
  control.id = `contact-${name}`;
  const entry = draft?.get(name);
  if (typeof entry === 'string') control.value = entry;
  const wrapper = el('label', label);
  wrapper.className = 'contact-field';
  wrapper.append(control);
  return wrapper;
}

function contactForm(draft: FormData | null): HTMLElement {
  const m = t().legal.contact;
  const form = el('form') as HTMLFormElement;
  form.id = 'contact';
  form.method = 'post';
  form.action = 'contact.php';

  const params = new URLSearchParams(location.search);
  const status = STATUSES.find((value) => value === params.get('contact'));
  if (status) {
    const notice = el('p', m.status[status]);
    notice.setAttribute('role', 'status');
    notice.className = status === 'sent' ? 'contact-sent' : 'contact-error';
    form.append(notice);
  }

  const name = document.createElement('input');
  name.autocomplete = 'name';
  name.maxLength = 200;
  const email = document.createElement('input');
  email.type = 'email';
  email.required = true;
  email.autocomplete = 'email';
  const message = document.createElement('textarea');
  message.required = true;
  message.rows = 6;
  message.maxLength = 5000;

  // People never see this field, but simple bots fill it in.
  const trap = document.createElement('input');
  trap.name = 'website';
  trap.tabIndex = -1;
  trap.autocomplete = 'off';
  const trapLabel = el('label', 'Website');
  trapLabel.className = 'contact-trap';
  trapLabel.setAttribute('aria-hidden', 'true');
  trapLabel.append(trap);

  const started = document.createElement('input');
  started.type = 'hidden';
  started.name = 'started';
  started.value = STARTED;

  // A translation error gets its own subject on the server, with the language and the page it was seen on.
  const topicFields: HTMLElement[] = [];
  if (params.get('topic') === 'translation') {
    form.append(el('p', m.translationNote(t().reportLanguages[getLang()])));
    const page = params.get('page') ?? '';
    for (const [name, value] of [['topic', 'translation'], ['lang', getLang()], ['page', /^[\w-]+\.html$/.test(page) ? page : '']]) {
      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = name;
      hidden.value = value;
      topicFields.push(hidden);
    }
  }

  const send = el('button', m.send) as HTMLButtonElement;
  send.type = 'submit';
  send.className = 'btn';

  form.append(
    formField(m.name, name, 'name', draft),
    formField(m.email, email, 'email', draft),
    formField(m.message, message, 'message', draft),
    trapLabel,
    started,
    ...topicFields,
    el('p', m.note),
    send,
  );
  return form;
}

function list(tag: 'ol' | 'ul', items: string[] = []): HTMLElement[] {
  if (items.length === 0) return [];
  const node = el(tag);
  node.append(...items.map((item) => el('li', item)));
  return [node];
}

function help(): HTMLElement[] {
  const m = t().help;
  const sections = m.sections.flatMap(({ title, steps, points, paragraphs = [] }) => [
    el('h2', title),
    ...list('ol', steps),
    ...list('ul', points),
    ...paragraphs.map((text) => el('p', text)),
  ]);
  const privacy = el('a', m.data.more) as HTMLAnchorElement;
  privacy.href = 'privacy.html';
  const more = el('p');
  more.append(privacy);
  const data = [...m.data.points.slice(0, 1), ...(SENDER_DB_ENABLED ? m.data.senderDbPoints : []), ...m.data.points.slice(1)];
  return [el('h1', m.title), el('p', m.intro), ...sections, el('h2', m.data.title), el('p', m.data.intro), ...list('ul', data), el('p', m.data.cookies), more];
}

function render(): void {
  const m = t().legal;
  const main = document.querySelector<HTMLElement>('#legal')!;
  if (main.dataset.page === 'help') {
    main.replaceChildren(...help());
    return;
  }
  if (main.dataset.page === 'privacy') {
    const texts = SENDER_DB_ENABLED ? [m.emailsWithSenderDb, ...m.privacySections.slice(1), m.senderDbSection] : m.privacySections;
    const sections = texts.flatMap(({ title, paragraphs }) => [el('h2', title), ...paragraphs.map((text) => el('p', text))]);
    main.replaceChildren(el('h1', m.privacyTitle), el('p', m.privacyIntro), el('h2', m.controllerTitle), contact(), ...sections, el('p', m.updated));
    return;
  }
  const current = document.querySelector<HTMLFormElement>('#contact');
  main.replaceChildren(
    el('h1', m.imprintTitle),
    el('p', m.imprintBasis),
    contact(),
    el('h2', m.contact.title),
    // A language change must not lose what was typed.
    contactForm(current ? new FormData(current) : null),
    el('h2', m.responsibleTitle),
    el('p', m.responsible(NAME)),
  );
  if (!current) document.querySelector(location.hash || '#none')?.scrollIntoView();
}

setupControls(render);
render();

import { getCountryCode, onCountryChange, setCountryCode } from './countryPreference';
import { COUNTRIES } from './data/reportingBodies';
import { applyStaticText, getLang, LANGS, setLang, t, type Lang } from './i18n';
import { createPicker, type Picker } from './picker';

const THEME_KEY = 'smt-watcher-theme';

const LANGUAGE_NAMES: Record<Lang, string> = { de: 'Deutsch', en: 'English', fr: 'Français', it: 'Italiano', nl: 'Nederlands', pl: 'Polski', da: 'Dansk', cs: 'Čeština', sk: 'Slovenčina', hu: 'Magyar', sl: 'Slovenščina', sv: 'Svenska', fi: 'Suomi', es: 'Español', pt: 'Português', nb: 'Norsk', bg: 'Български', ro: 'Română', el: 'Ελληνικά', et: 'Eesti', lv: 'Latviešu', lt: 'Lietuvių', hr: 'Hrvatski' };

/** Set by the build from package.json. */
declare const __APP_VERSION__: string;

function storedTheme(): string | null {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function currentTheme(): 'light' | 'dark' {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === 'light' || chosen === 'dark') return chosen;
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/** Country names in the current language, sorted, with "another country" last. */
function countryOptions() {
  const names = t().country;
  const entries = COUNTRIES.map((country) => ({ value: country.code, label: names[country.code] ?? country.code }));
  const other = entries.pop()!;
  return [...entries.sort((a, b) => a.label.localeCompare(b.label, getLang())), other];
}

/** A picker for the country of the reports, kept in step with every other one on the page. */
export function createCountryPicker(): Picker {
  const picker = createPicker(countryOptions(), getCountryCode(), setCountryCode);
  onCountryChange((code) => picker.setValue(code));
  return picker;
}

/** Adds the country, language and theme switches to the header. Without a stored choice, the system setting applies. */
export function setupControls(onLanguageChange: () => void, onCountryChanged?: () => void): void {
  const stored = storedTheme();
  if (stored === 'light' || stored === 'dark') document.documentElement.dataset.theme = stored;

  // Each language is named in itself, so that people find their own, with its code to type.
  const languagePicker = createPicker(
    LANGS.map((code) => ({ value: code, label: `${LANGUAGE_NAMES[code]} (${code.toUpperCase()})`, lang: code })),
    getLang(),
    (code) => {
      setLang(code as Lang);
      applyStaticText();
      rebuildCountries();
      refresh();
      onLanguageChange();
    },
  );
  const language = languagePicker.input;
  language.classList.add('picker-language');

  const countrySlot = document.createElement('span');
  countrySlot.className = 'picker-slot';
  let countryPicker = createCountryPicker();
  countrySlot.append(...countryPicker.elements);
  // Country names follow the page language, so the list is built anew after a change.
  const rebuildCountries = () => {
    countryPicker = createCountryPicker();
    countrySlot.replaceChildren(...countryPicker.elements);
    countryPicker.input.setAttribute('aria-label', t().reportCountry);
    countryPicker.input.title = t().reportCountry;
  };
  if (onCountryChanged) onCountryChange(onCountryChanged);
  const theme = document.createElement('button');
  theme.type = 'button';

  const refresh = () => {
    languagePicker.setValue(getLang());
    language.setAttribute('aria-label', t().controls.language);
    countryPicker.input.setAttribute('aria-label', t().reportCountry);
    countryPicker.input.title = t().reportCountry;
    language.title = t().controls.language;

    const toLight = currentTheme() === 'dark';
    theme.textContent = toLight ? '☀' : '☾';
    const themeLabel = toLight ? t().controls.toLight : t().controls.toDark;
    theme.setAttribute('aria-label', themeLabel);
    theme.title = themeLabel;
  };

  theme.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // The choice then only lasts until the page closes.
    }
    refresh();
  });

  const controls = document.createElement('span');
  controls.className = 'controls';
  controls.append(countrySlot, ...languagePicker.elements, theme);
  document.querySelector('.top')?.append(controls);

  // Reports go through the contact form, which then sends its own subject with the language and page.
  const translation = document.createElement('a');
  const site = location.protocol.startsWith('http') ? '' : (import.meta.env.VITE_SITE_URL ?? '');
  const page = location.pathname.split('/').pop() || 'index.html';
  translation.href = `${site}imprint.html?topic=translation&page=${encodeURIComponent(page)}#contact`;
  if (site) {
    translation.target = '_blank';
    translation.rel = 'noopener noreferrer';
  }
  translation.dataset.i18n = 'translationLink';
  document.querySelector('.foot')?.append(translation);

  const version = document.createElement('span');
  version.className = 'version';
  version.textContent = `Beta ${__APP_VERSION__}`;
  document.querySelector('.foot')?.append(version);

  applyStaticText();
  refresh();
}

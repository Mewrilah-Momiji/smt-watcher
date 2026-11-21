// The start page and the help page also exist in a folder per language, such as de/, for search engines.
// Such a copy shows its language even when the visitor chose another one before. The build marks it on <html>.
import { LANGS, showLang, type Lang } from './i18n';

const marks = document.documentElement.dataset;

/** The way from this page to the site's root folder: ../ in a language folder, else nothing. */
export const ROOT = marks.root === '../' ? '../' : '';

/** Shows the language of a language copy. Call before the page writes its text. */
export function useLanguagePage(): void {
  const lang = marks.pageLang as Lang | undefined;
  if (lang && LANGS.includes(lang)) showLang(lang);
}

/** Points the translation report link in the footer to the root, where the imprint is. */
export function fixRootLinks(): void {
  if (!ROOT) return;
  const link = document.querySelector<HTMLAnchorElement>('.foot a[data-i18n="translationLink"]');
  const target = link?.getAttribute('href');
  if (link && target && !/^[a-z]+:/i.test(target)) link.setAttribute('href', `${ROOT}${target}`);
}

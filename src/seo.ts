// Fills the built pages with their text, so that search engines and people without JavaScript see the content.
// The start page and the help page also exist in German under de/, so that searches in German find them.
// The page script still translates everything into the chosen language when it starts.
import { checkInfoHtml } from './checkInfo';
import { guideTitlePart, LANGS, messagesFor, pageTitle, type Lang } from './i18n';

type Page = { file: string; titleKey: 'question' | 'helpLink' | 'imprintLink' | 'privacyLink'; inSitemap: boolean };

export const SEO_PAGES: Page[] = [
  { file: 'index.html', titleKey: 'question', inSitemap: true },
  { file: 'help.html', titleKey: 'helpLink', inSitemap: true },
  { file: 'imprint.html', titleKey: 'imprintLink', inSitemap: false },
  { file: 'privacy.html', titleKey: 'privacyLink', inSitemap: false },
];

/** Languages with their own copy of the pages in the sitemap, in a folder named after the language. English is at the root. */
export const PAGE_LANGS: Lang[] = ['de'];

/** The pages that have a copy per language. Imprint and privacy policy stay at the root only. */
export const TRANSLATED_FILES = ['index.html', 'help.html'];

/** The built file of a page in a language, such as de/help.html. */
export function langFile(file: string, lang: Lang): string {
  return lang === 'en' ? file : `${lang}/${file}`;
}

/** Splits a built file such as de/help.html into the page and its language. */
export function splitLangFile(path: string): { file: string; lang: Lang } {
  const match = /^([a-z]{2})\/(.+)$/.exec(path);
  if (match && PAGE_LANGS.includes(match[1] as Lang)) return { file: match[2], lang: match[1] as Lang };
  return { file: path, lang: 'en' };
}

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The address of a page, with a start page as the bare folder address. */
export function pageUrl(site: string, file: string, lang: Lang = 'en'): string {
  const folder = lang === 'en' ? '' : `${lang}/`;
  return file === 'index.html' ? `${site}${folder}` : `${site}${folder}${file}`;
}

function description(file: string, senderDb: boolean, lang: Lang): string | undefined {
  const m = messagesFor(lang);
  if (file === 'index.html') return `${m.static.lead} ${senderDb ? m.static.privacyWithSenderDb : m.static.privacy}`;
  if (file === 'help.html') return m.help.intro;
  return undefined;
}

/**
 * Turns a page's source into its copy in a language folder. Links to pages without a copy and to files at the root
 * get ../ in front. The page script reads data-page-lang to show that language, and data-root for links it creates.
 */
export function langSource(html: string, lang: Lang): string {
  const local = new Set(TRANSLATED_FILES.filter((file) => file !== 'index.html'));
  return html
    .replace(/<html lang="en"/, `<html lang="${lang}" data-page-lang="${lang}" data-root="../"`)
    .replace(/(\s(?:href|src)=")(?!https?:|mailto:|#|\/|\.\/"|\.\.\/)(?:\.\/)?([^"]+)"/g, (whole, start: string, target: string) =>
      local.has(target) ? whole : `${start}../${target}"`,
    );
}

/** Writes the text of a language into elements that the page script fills in, as it would for that language. */
export function fillStaticText(html: string, senderDb: boolean, lang: Lang = 'en'): string {
  const m = messagesFor(lang);
  const texts: Record<string, string> = { ...m.static, ...(senderDb ? { privacy: m.static.privacyWithSenderDb } : {}) };
  const fill = (attribute: string, text: (key: string) => string | undefined) =>
    (source: string) =>
      source.replace(new RegExp(`(<(\\w+)\\b[^>]*\\s${attribute}="([\\w-]+)"[^>]*>)[^<]*</\\2>`, 'g'), (whole, open: string, tag: string, key: string) => {
        const value = text(key);
        return value === undefined ? whole : `${open}${escape(value)}</${tag}>`;
      });
  const steps = [
    fill('data-i18n', (key) => texts[key]),
    fill('data-i18n-program', (key) => (texts[key] === undefined ? undefined : guideTitlePart(texts[key], 'program'))),
    fill('data-i18n-kind', (key) => (texts[key] === undefined ? undefined : guideTitlePart(texts[key], 'kind'))),
  ];
  const filled = steps.reduce((result, step) => step(result), html);
  return filled.replace('<details class="fold" id="check-info"></details>', `<details class="fold" id="check-info">${checkInfoHtml(lang, escape)}</details>`);
}

/** The help page in a language, built like src/legal.ts builds it. */
export function helpHtml(senderDb: boolean, lang: Lang = 'en'): string {
  const m = messagesFor(lang).help;
  const root = lang === 'en' ? '' : '../';
  const list = (tag: 'ol' | 'ul', items: string[] = []) => (items.length === 0 ? '' : `<${tag}>${items.map((item) => `<li>${escape(item)}</li>`).join('')}</${tag}>`);
  const sections = m.sections
    .map(({ title, steps, points, paragraphs = [] }) => `<h2>${escape(title)}</h2>${list('ol', steps)}${list('ul', points)}${paragraphs.map((text) => `<p>${escape(text)}</p>`).join('')}`)
    .join('');
  const data = [...m.data.points.slice(0, 1), ...(senderDb ? m.data.senderDbPoints : []), ...m.data.points.slice(1)];
  return (
    `<h1>${escape(m.title)}</h1><p>${escape(m.intro)}</p>${sections}` +
    `<h2>${escape(m.data.title)}</h2><p>${escape(m.data.intro)}</p>${list('ul', data)}` +
    `<p>${escape(m.data.cookies)}</p><p><a href="${root}privacy.html">${escape(m.data.more)}</a></p>`
  );
}

/** The page's title in a language. */
export function seoTitle(file: string, lang: Lang = 'en'): string | undefined {
  const page = SEO_PAGES.find((entry) => entry.file === file);
  return page ? pageTitle(messagesFor(lang).static, page.titleKey) : undefined;
}

type Tag = { tag: string; attrs?: Record<string, string>; children?: string; injectTo: 'head' };

/** Title, description, address, language versions and preview data for one page. Without a site address only the text parts are set. */
export function headTags(file: string, site: string, senderDb: boolean, lang: Lang = 'en'): Tag[] {
  const page = SEO_PAGES.find((entry) => entry.file === file);
  if (!page) return [];
  const m = messagesFor(lang);
  const title = pageTitle(m.static, page.titleKey);
  const text = description(file, senderDb, lang);
  const meta = (attrs: Record<string, string>): Tag => ({ tag: 'meta', attrs, injectTo: 'head' });
  const link = (attrs: Record<string, string>): Tag => ({ tag: 'link', attrs, injectTo: 'head' });
  const tags: Tag[] = [];
  if (text) tags.push(meta({ name: 'description', content: text }));
  if (!page.inSitemap) tags.push(meta({ name: 'robots', content: 'noindex, follow' }));
  if (!site) return tags;
  const url = pageUrl(site, file, lang);
  tags.push(link({ rel: 'canonical', href: url }));
  tags.push(link({ rel: 'apple-touch-icon', href: `${lang === 'en' ? '' : '../'}apple-touch-icon.png` }));
  // Each language version names all of them, itself included, and English as the one for everyone else.
  if (TRANSLATED_FILES.includes(file)) {
    for (const version of ['en', ...PAGE_LANGS] as Lang[]) tags.push(link({ rel: 'alternate', hreflang: version, href: pageUrl(site, file, version) }));
    tags.push(link({ rel: 'alternate', hreflang: 'x-default', href: pageUrl(site, file) }));
  }
  tags.push(
    meta({ property: 'og:type', content: 'website' }),
    meta({ property: 'og:site_name', content: m.static.brand }),
    meta({ property: 'og:title', content: title }),
    meta({ property: 'og:url', content: url }),
    meta({ property: 'og:locale', content: lang === 'en' ? 'en_US' : `${lang}_${lang.toUpperCase()}` }),
    // The preview image shows the start page's question in the page's language. scripts/site-images.mjs draws it.
    meta({ property: 'og:image', content: `${site}${lang === 'en' || !PAGE_LANGS.includes(lang) ? 'og-image.png' : `og-image-${lang}.png`}` }),
    meta({ property: 'og:image:width', content: '1200' }),
    meta({ property: 'og:image:height', content: '630' }),
    meta({ property: 'og:image:alt', content: `${m.static.brand}: ${m.static.question}` }),
    meta({ name: 'twitter:card', content: 'summary_large_image' }),
  );
  if (text) tags.push(meta({ property: 'og:description', content: text }));
  if (file === 'index.html') {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: m.static.brand,
      alternateName: m.static.kicker,
      url,
      description: text,
      applicationCategory: 'SecurityApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript',
      isAccessibleForFree: true,
      inLanguage: lang === 'en' ? LANGS : lang,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    };
    // A data block is not run as a script, so the page's script policy does not block it.
    tags.push({ tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(data).replace(/</g, '\\u003c'), injectTo: 'head' });
  }
  return tags;
}

export function sitemapXml(site: string): string {
  const urls = SEO_PAGES.filter((page) => page.inSitemap).flatMap((page) =>
    (['en', ...(TRANSLATED_FILES.includes(page.file) ? PAGE_LANGS : [])] as Lang[]).map((lang) => `  <url><loc>${escape(pageUrl(site, page.file, lang))}</loc></url>`),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

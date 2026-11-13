// Fills the built pages with their English text, so that search engines and people without JavaScript see
// the content. The page script still translates everything into the chosen language when it starts.
import { guideTitlePart, LANGS, messagesFor, pageTitle } from './i18n';

type Page = { file: string; titleKey: 'question' | 'helpLink' | 'imprintLink' | 'privacyLink'; inSitemap: boolean };

export const SEO_PAGES: Page[] = [
  { file: 'index.html', titleKey: 'question', inSitemap: true },
  { file: 'help.html', titleKey: 'helpLink', inSitemap: true },
  { file: 'imprint.html', titleKey: 'imprintLink', inSitemap: false },
  { file: 'privacy.html', titleKey: 'privacyLink', inSitemap: false },
];

const en = messagesFor('en');

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The address of a page, with the start page as the bare site address. */
export function pageUrl(site: string, file: string): string {
  return file === 'index.html' ? site : `${site}${file}`;
}

function description(file: string, senderDb: boolean): string | undefined {
  if (file === 'index.html') return `${en.static.lead} ${senderDb ? en.static.privacyWithSenderDb : en.static.privacy}`;
  if (file === 'help.html') return en.help.intro;
  return undefined;
}

/** Writes the English text into elements that the page script fills in, as it would for English. */
export function fillStaticText(html: string, senderDb: boolean): string {
  const texts: Record<string, string> = { ...en.static, ...(senderDb ? { privacy: en.static.privacyWithSenderDb } : {}) };
  const fill = (attribute: string, text: (key: string) => string | undefined) =>
    (source: string) =>
      source.replace(new RegExp(`(<(\\w+)\\b[^>]*\\s${attribute}="([\\w-]+)"[^>]*>)</\\2>`, 'g'), (whole, open: string, tag: string, key: string) => {
        const value = text(key);
        return value === undefined ? whole : `${open}${escape(value)}</${tag}>`;
      });
  const steps = [
    fill('data-i18n', (key) => texts[key]),
    fill('data-i18n-program', (key) => (texts[key] === undefined ? undefined : guideTitlePart(texts[key], 'program'))),
    fill('data-i18n-kind', (key) => (texts[key] === undefined ? undefined : guideTitlePart(texts[key], 'kind'))),
  ];
  return steps.reduce((result, step) => step(result), html);
}

/** The help page in English, built like src/legal.ts builds it. */
export function helpHtml(senderDb: boolean): string {
  const m = en.help;
  const list = (tag: 'ol' | 'ul', items: string[] = []) => (items.length === 0 ? '' : `<${tag}>${items.map((item) => `<li>${escape(item)}</li>`).join('')}</${tag}>`);
  const sections = m.sections
    .map(({ title, steps, points, paragraphs = [] }) => `<h2>${escape(title)}</h2>${list('ol', steps)}${list('ul', points)}${paragraphs.map((text) => `<p>${escape(text)}</p>`).join('')}`)
    .join('');
  const data = [...m.data.points.slice(0, 1), ...(senderDb ? m.data.senderDbPoints : []), ...m.data.points.slice(1)];
  return (
    `<h1>${escape(m.title)}</h1><p>${escape(m.intro)}</p>${sections}` +
    `<h2>${escape(m.data.title)}</h2><p>${escape(m.data.intro)}</p>${list('ul', data)}` +
    `<p>${escape(m.data.cookies)}</p><p><a href="privacy.html">${escape(m.data.more)}</a></p>`
  );
}

type Tag = { tag: string; attrs?: Record<string, string>; children?: string; injectTo: 'head' };

/** Title, description, address and preview data for one page. Without a site address only the text parts are set. */
export function headTags(file: string, site: string, senderDb: boolean): Tag[] {
  const page = SEO_PAGES.find((entry) => entry.file === file);
  if (!page) return [];
  const title = pageTitle(en.static, page.titleKey);
  const text = description(file, senderDb);
  const meta = (attrs: Record<string, string>): Tag => ({ tag: 'meta', attrs, injectTo: 'head' });
  const tags: Tag[] = [];
  if (text) tags.push(meta({ name: 'description', content: text }));
  if (!page.inSitemap) tags.push(meta({ name: 'robots', content: 'noindex, follow' }));
  if (!site) return tags;
  const url = pageUrl(site, file);
  tags.push(
    { tag: 'link', attrs: { rel: 'canonical', href: url }, injectTo: 'head' },
    meta({ property: 'og:type', content: 'website' }),
    meta({ property: 'og:site_name', content: en.static.brand }),
    meta({ property: 'og:title', content: title }),
    meta({ property: 'og:url', content: url }),
    meta({ name: 'twitter:card', content: 'summary' }),
  );
  if (text) tags.push(meta({ property: 'og:description', content: text }));
  if (file === 'index.html') {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: en.static.brand,
      alternateName: en.static.kicker,
      url: site,
      description: text,
      applicationCategory: 'SecurityApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript',
      isAccessibleForFree: true,
      inLanguage: LANGS,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    };
    // A data block is not run as a script, so the page's script policy does not block it.
    tags.push({ tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(data).replace(/</g, '\\u003c'), injectTo: 'head' });
  }
  return tags;
}

export function sitemapXml(site: string): string {
  const urls = SEO_PAGES.filter((page) => page.inSitemap).map((page) => `  <url><loc>${escape(pageUrl(site, page.file))}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

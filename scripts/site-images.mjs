// Draws the site's preview images and icons into public/ with the installed Chrome: one preview image per language with
// its own pages (og-image.png, og-image-de.png), favicon.ico for programs that do not read SVG, and apple-touch-icon.png.
// Run it after changing favicon.svg or the start page's question: node scripts/site-images.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

// The texts are TypeScript modules, which Vite loads here without a build.
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { messagesFor } = await vite.ssrLoadModule('/src/i18n.ts');
const { PAGE_LANGS } = await vite.ssrLoadModule('/src/seo.ts');
await vite.close();

const PUBLIC = new URL('../public/', import.meta.url);
const shield = readFileSync(new URL('favicon.svg', PUBLIC), 'utf8');

function escape(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function previewHtml(lang) {
  const m = messagesFor(lang).static;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
    * { margin: 0; box-sizing: border-box; }
    body { width: 1200px; height: 630px; display: flex; align-items: center; gap: 64px; padding: 0 96px;
      font-family: 'Segoe UI', system-ui, Arial, sans-serif; color: #e6ecf5;
      background: radial-gradient(circle at 18% 30%, rgba(92, 200, 255, 0.22), transparent 55%), #0b1220; }
    .shield { width: 260px; height: 260px; flex: none; }
    .shield svg { width: 100%; height: 100%; }
    .kicker { font-size: 30px; color: #9dabc0; letter-spacing: 0.04em; }
    h1 { font-size: 78px; line-height: 1.05; margin: 14px 0 26px;
      background: linear-gradient(90deg, #5cc8ff, #8c9cff); -webkit-background-clip: text; color: transparent; }
    .brand { font-size: 40px; font-weight: 600; }
    .site { font-size: 28px; color: #9dabc0; margin-top: 8px; }
  </style></head><body>
    <div class="shield">${shield}</div>
    <div><p class="kicker">${escape(m.kicker)}</p><h1>${escape(m.question)}</h1>
    <p class="brand">${escape(m.brand)}</p><p class="site">smtwatcher.com</p></div>
  </body></html>`;
}

/** An .ico file that holds PNG images, which every current program reads. */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map(({ png }) => png)]);
}

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const lang of ['en', ...PAGE_LANGS]) {
    await page.setContent(previewHtml(lang));
    const file = lang === 'en' ? 'og-image.png' : `og-image-${lang}.png`;
    writeFileSync(new URL(file, PUBLIC), await page.screenshot({ type: 'png' }));
    console.log(`public/${file}`);
  }

  const icon = async (size, background) => {
    await page.setViewportSize({ width: size, height: size });
    const pad = background ? Math.round(size * 0.12) : 0;
    await page.setContent(`<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;background:${background ?? 'transparent'};padding:${pad}px;box-sizing:border-box">
      <div style="width:100%;height:100%">${shield.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`);
    return page.screenshot({ type: 'png', omitBackground: !background });
  };
  const sizes = [16, 32, 48];
  const images = [];
  for (const size of sizes) images.push({ size, png: await icon(size) });
  writeFileSync(new URL('favicon.ico', PUBLIC), ico(images));
  console.log('public/favicon.ico');
  // Apple puts the icon on a square tile and fills transparent parts with black, so it gets the page's background.
  writeFileSync(new URL('apple-touch-icon.png', PUBLIC), await icon(180, '#0b1220'));
  console.log('public/apple-touch-icon.png');
} finally {
  await browser.close();
}

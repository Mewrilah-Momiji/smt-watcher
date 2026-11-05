import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { RDAP_HOSTS } from './src/core/abuseContact';
import { serverListsPhp } from './src/core/sharedLists';

const require = createRequire(import.meta.url);
// package.json holds both versions. The extension has its own, so that it is only released when its build changes.
const { version: pageVersion, thunderbirdVersion } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string; thunderbirdVersion: string };

// The built page may only connect to the abuse contact lookup, which the user starts by clicking. Email data cannot leave the browser.
const cspBase = (database: string): string[] => [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  `connect-src ${database}${Object.keys(RDAP_HOSTS).map((host) => `https://${host}`).join(' ')}`,
  "base-uri 'none'",
];

// Only the imprint may send a form, and only to this site. The page that reads emails may not.
const cspFor = (path: string, database: string): string => [...cspBase(database), `form-action ${path.endsWith('imprint.html') ? "'self'" : "'none'"}`].join('; ');

export default defineConfig(({ mode }) => {
  const version = mode === 'thunderbird' ? thunderbirdVersion : pageVersion;
  // The extension links to the page and reaches its server, both named in .env.local, so that a copy of the code
  // does not send reports to someone else's server.
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const site = mode === 'thunderbird' ? env.VITE_SITE_URL ?? '' : '';
  const addonId = env.VITE_ADDON_ID ?? '';
  // The normal build may not reach the database. The extension has to name the page's server.
  const databaseOrigin = mode === 'senderdb' ? "'self' " : mode === 'thunderbird' && URL.canParse(site) ? `${new URL(site).origin} ` : '';
  return {
  base: './',
  envDir: process.cwd(),
  define: { __APP_VERSION__: JSON.stringify(version) },
  ...(mode === 'thunderbird'
    ? {
        root: 'extensions/thunderbird',
        build: {
          outDir: '../../dist-thunderbird',
          emptyOutDir: true,
          rollupOptions: {
            input: { page: 'extensions/thunderbird/page.html', background: 'extensions/thunderbird/background.ts' },
            output: { entryFileNames: '[name].js' },
          },
        },
      }
    : { build: { rollupOptions: { input: ['index.html', 'help.html', 'imprint.html', 'privacy.html'] } } }),
  resolve: {
    // The .msg and RTF libraries also need these Node modules in the browser.
    alias: [
      { find: /^buffer$/, replacement: require.resolve('buffer/') },
      { find: /^string_decoder$/, replacement: require.resolve('string_decoder/') },
      { find: /^stream$/, replacement: require.resolve('stream-browserify') },
      { find: /^events$/, replacement: require.resolve('events/') },
    ],
  },
  plugins: [
    {
      // The imprint needs the operator's details from .env.local. The extension links to the page's imprint and needs its address.
      name: 'operator-settings',
      apply: 'build',
      configResolved(config) {
        if (mode === 'thunderbird') {
          if (!/^https:\/\/[^/]+\/$/.test(site) || !addonId) throw new Error('.env.local lacks VITE_SITE_URL (https://host/) or VITE_ADDON_ID. See .env.example.');
          return;
        }
        const missing = ['VITE_OPERATOR_NAME', 'VITE_OPERATOR_STREET', 'VITE_OPERATOR_CITY', 'VITE_OPERATOR_EMAIL'].filter((key) => !config.env[key]);
        if (missing.length > 0) throw new Error(`.env.local lacks ${missing.join(', ')}. Copy .env.example to .env.local and fill it in.`);
      },
    },
    {
      name: 'extension-version',
      apply: 'build',
      closeBundle() {
        if (mode !== 'thunderbird') return;
        const file = resolve('dist-thunderbird/manifest.json');
        const manifest = JSON.parse(readFileSync(file, 'utf8'));
        manifest.browser_specific_settings.gecko.id = addonId;
        manifest.host_permissions = [`${site}*`];
        writeFileSync(file, JSON.stringify({ ...manifest, version }, null, 2));
      },
    },
    {
      // The server's PHP reads the lists it shares with the page from this file, so that they have one source.
      name: 'server-lists',
      apply: 'build',
      generateBundle() {
        if (mode !== 'thunderbird') this.emitFile({ type: 'asset', fileName: 'private/lists.php', source: serverListsPhp() });
      },
    },
    {
      name: 'csp-build-only',
      apply: 'build',
      transformIndexHtml: (_html, { path }) => [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: cspFor(path, databaseOrigin) },
          injectTo: 'head-prepend',
        },
      ],
    },
  ],
};
});

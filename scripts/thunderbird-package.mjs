// Packages the built extension for download from the page's own server. It writes public/thunderbird/, which the
// next page build copies into dist/ and the deploy uploads:
//   smt-watcher-<version>.xpi   the release, named by version, so that Thunderbird never holds an older file of that name
//   smt-watcher.xpi             the same file under a fixed name, for the download link on the page
//   updates.json                tells installed copies that a new version exists (update_url in the manifest)
// Git ignores the folder: the files carry the operator's add-on ID and address from .env.local.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const dist = join(root, 'dist-thunderbird');
const out = join(root, 'public', 'thunderbird');

if (!existsSync(join(dist, 'manifest.json'))) {
  console.error('No dist-thunderbird yet. Run npm run package:thunderbird, which builds first.');
  process.exit(2);
}
const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'));
const { id, update_url: updateUrl, strict_min_version: minVersion } = manifest.browser_specific_settings.gecko;
const { version } = manifest;
const base = new URL('.', updateUrl).href;

mkdirSync(out, { recursive: true });
const file = `smt-watcher-${version}.xpi`;
const target = join(out, file);
rmSync(target, { force: true });
// The tar of Windows writes zip files, the tar of Git Bash cannot. Elsewhere bsdtar does it.
const tar = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'bsdtar';
execFileSync(tar, ['--format', 'zip', '-cf', target, '-C', dist, 'background.js', 'icon.svg', 'manifest.json', 'page.html', 'page.js', 'assets'], { stdio: 'inherit' });
copyFileSync(target, join(out, 'smt-watcher.xpi'));

const hash = createHash('sha256').update(readFileSync(target)).digest('hex');
const updates = {
  addons: {
    [id]: {
      updates: [{ version, update_link: `${base}${file}`, update_hash: `sha256:${hash}`, applications: { gecko: { strict_min_version: minVersion } } }],
    },
  },
};
writeFileSync(join(out, 'updates.json'), `${JSON.stringify(updates, null, 2)}\n`);
console.log(`Packaged Thunderbird ${version} into public/thunderbird/. Run npm run deploy:senderdb to put it online.`);

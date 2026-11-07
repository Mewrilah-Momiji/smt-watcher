// Shared by the check, the packaging and the deploy, so that they agree on what counts as a change and what goes online.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
export const dist = join(root, 'dist-thunderbird');
export const packageDir = join(root, 'public', 'thunderbird');
export const releasedFile = join(root, 'extensions', 'thunderbird', 'released.json');

export const thunderbirdVersion = () => JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).thunderbirdVersion;
export const released = () => (existsSync(releasedFile) ? JSON.parse(readFileSync(releasedFile, 'utf8')) : undefined);

// Compares versions such as 0.5.35 number by number.
export function compareVersions(a, b) {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return Math.sign(d);
  }
  return 0;
}

export function buildExtension() {
  execFileSync(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'build', '--mode', 'thunderbird', '--logLevel', 'error'], { cwd: root, stdio: 'inherit' });
}

const files = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : [path];
});

// The version in the manifest is left out, so that only real changes count.
export function fingerprint() {
  if (!existsSync(join(dist, 'manifest.json'))) throw new Error('No dist-thunderbird yet. Build the extension first.');
  const hash = createHash('sha256');
  for (const path of files(dist).sort()) {
    const name = relative(dist, path).replaceAll('\\', '/');
    let content = readFileSync(path);
    if (name === 'manifest.json') {
      const manifest = JSON.parse(content.toString('utf8'));
      delete manifest.version;
      content = Buffer.from(JSON.stringify(manifest));
    }
    hash.update(`${name}\0`).update(content).update('\0');
  }
  return hash.digest('hex');
}

export function record() {
  const version = thunderbirdVersion();
  writeFileSync(releasedFile, `${JSON.stringify({ version, fingerprint: fingerprint() }, null, 2)}\n`);
  return version;
}

export function manifestInfo() {
  const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'));
  const { id, update_url: updateUrl, strict_min_version: minVersion } = manifest.browser_specific_settings.gecko;
  return { id, updateUrl, minVersion, version: manifest.version };
}

// Writes public/thunderbird/, which the page build copies into dist/:
//   smt-watcher-<version>.xpi   the release, named by version, so that Thunderbird never holds an older file of that name
//   smt-watcher.xpi             the same file under a fixed name, for the download link on the page
//   updates.json                tells installed copies that a new version exists (update_url in the manifest)
// Git ignores the folder: the files carry the operator's add-on ID and address from .env.local.
export function packageExtension() {
  const { id, updateUrl, minVersion, version } = manifestInfo();
  const base = new URL('.', updateUrl).href;
  mkdirSync(packageDir, { recursive: true });
  const file = `smt-watcher-${version}.xpi`;
  const target = join(packageDir, file);
  rmSync(target, { force: true });
  // The tar of Windows writes zip files, the tar of Git Bash cannot. Elsewhere bsdtar does it.
  const tar = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'bsdtar';
  execFileSync(tar, ['--format', 'zip', '-cf', target, '-C', dist, 'background.js', 'icon.svg', 'manifest.json', 'page.html', 'page.js', 'assets'], { stdio: 'inherit' });
  copyFileSync(target, join(packageDir, 'smt-watcher.xpi'));
  const hash = createHash('sha256').update(readFileSync(target)).digest('hex');
  const updates = {
    addons: {
      [id]: {
        updates: [{ version, update_link: `${base}${file}`, update_hash: `sha256:${hash}`, applications: { gecko: { strict_min_version: minVersion } } }],
      },
    },
  };
  writeFileSync(join(packageDir, 'updates.json'), `${JSON.stringify(updates, null, 2)}\n`);
  return { version, updateUrl };
}

// The newest version that the server offers, or undefined if it offers none yet.
export async function liveVersion(updateUrl) {
  const response = await fetch(updateUrl, { cache: 'no-store' });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`${updateUrl} answered ${response.status}`);
  const updates = Object.values((await response.json()).addons ?? {}).flatMap((addon) => addon.updates ?? []);
  return updates.map((update) => update.version).sort(compareVersions).at(-1);
}

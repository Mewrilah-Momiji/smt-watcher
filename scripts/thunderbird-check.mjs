// Tells whether the built Thunderbird extension differs from the last released one, so that a website release
// does not drag the extension along when nothing in it changed.
// Usage: npm run check:thunderbird            (builds, then compares)
//        node scripts/thunderbird-check.mjs --record   (after installing a release: stores its fingerprint)
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const dist = join(root, 'dist-thunderbird');
const releasedFile = join(root, 'extensions', 'thunderbird', 'released.json');
const { thunderbirdVersion } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

if (!existsSync(dist)) {
  console.error('No dist-thunderbird yet. Run npm run check:thunderbird, which builds first.');
  process.exit(2);
}

const files = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : [path];
});

// The version in the manifest is left out, so that only real changes count.
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
const fingerprint = hash.digest('hex');

if (process.argv.includes('--record')) {
  writeFileSync(releasedFile, `${JSON.stringify({ version: thunderbirdVersion, fingerprint }, null, 2)}\n`);
  console.log(`Recorded Thunderbird ${thunderbirdVersion}.`);
  process.exit(0);
}

if (!existsSync(releasedFile)) {
  console.log('No released fingerprint recorded yet: release the extension, then run node scripts/thunderbird-check.mjs --record.');
  process.exit(1);
}
const released = JSON.parse(readFileSync(releasedFile, 'utf8'));
if (released.fingerprint === fingerprint) {
  console.log(`Unchanged since Thunderbird ${released.version}: no extension release needed.`);
} else {
  console.log(`Changed since Thunderbird ${released.version}: raise thunderbirdVersion in package.json (now ${thunderbirdVersion}) and release the extension.`);
  process.exit(1);
}

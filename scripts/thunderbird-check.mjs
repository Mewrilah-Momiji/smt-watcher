// Tells whether the built Thunderbird extension differs from the last released one, so that a website release
// does not drag the extension along when nothing in it changed.
// Usage: npm run check:thunderbird            (builds, then compares)
//        node scripts/thunderbird-check.mjs --record   (stores the fingerprint; the deploy does this by itself)
import { existsSync } from 'node:fs';
import { dist, fingerprint, record, released, thunderbirdVersion } from './thunderbird-lib.mjs';

if (!existsSync(dist)) {
  console.error('No dist-thunderbird yet. Run npm run check:thunderbird, which builds first.');
  process.exit(2);
}

if (process.argv.includes('--record')) {
  console.log(`Recorded Thunderbird ${record()}.`);
  process.exit(0);
}

const last = released();
if (!last) {
  console.log('No released fingerprint recorded yet: release the extension, then run node scripts/thunderbird-check.mjs --record.');
  process.exit(1);
}
if (last.fingerprint === fingerprint()) {
  console.log(`Unchanged since Thunderbird ${last.version}: no extension release needed.`);
} else {
  console.log(`Changed since Thunderbird ${last.version}: raise thunderbirdVersion in package.json (now ${thunderbirdVersion()}). The next deploy then uploads it.`);
  process.exit(1);
}

// Packages the built extension for download from the page's own server into public/thunderbird/.
// The deploy does this by itself when the extension changed (scripts/thunderbird-release.mjs). Run it by hand
// only to look at the package: npm run package:thunderbird
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { dist, packageExtension } from './thunderbird-lib.mjs';

if (!existsSync(join(dist, 'manifest.json'))) {
  console.error('No dist-thunderbird yet. Run npm run package:thunderbird, which builds first.');
  process.exit(2);
}
const { version } = packageExtension();
console.log(`Packaged Thunderbird ${version} into public/thunderbird/.`);

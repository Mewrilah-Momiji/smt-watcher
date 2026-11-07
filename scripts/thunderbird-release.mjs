// Runs before every page build of the deploy and decides whether the Thunderbird extension goes online with it:
// - unchanged since the last release: nothing to do, the server keeps the files it has
// - changed, thunderbirdVersion raised: package it into public/thunderbird/, which the page build copies into dist/.
//   The deploy records the release once the upload has worked.
// - changed, version not raised: stop, because installed copies would not see the new code as an update
// It never offers a version that is not newer than the one on the server.
import { rmSync } from 'node:fs';
import { buildExtension, compareVersions, fingerprint, liveVersion, manifestInfo, packageDir, packageExtension, released, thunderbirdVersion } from './thunderbird-lib.mjs';

// public/thunderbird/ may only hold what this run decides, never a package left over from an earlier one.
rmSync(packageDir, { recursive: true, force: true });
buildExtension();
const last = released();
const version = thunderbirdVersion();

if (last && last.fingerprint === fingerprint()) {
  console.log(`Thunderbird: unchanged since ${last.version}, not uploaded again.`);
  process.exit(0);
}
if (last && compareVersions(version, last.version) <= 0) {
  console.error(`Thunderbird: the extension changed since ${last.version}, but thunderbirdVersion is still ${version}. Raise it in package.json by 0.0.1 and deploy again.`);
  process.exit(1);
}
const live = await liveVersion(manifestInfo().updateUrl);
if (live && compareVersions(version, live) <= 0) {
  console.error(`Thunderbird: the server already offers ${live}, which is not older than ${version}. Raise thunderbirdVersion in package.json.`);
  process.exit(1);
}
packageExtension();
console.log(`Thunderbird: ${version} packaged${live ? `, replaces ${live} on the server` : ''}. It goes online with this deploy.`);

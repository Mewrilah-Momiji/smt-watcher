// Uploads the built page in dist/ over SSH with a key, or over encrypted FTP. Access data stays in .deploy.env,
// which Git ignores. scripts/remote.mjs describes both ways.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, describe, missingSettings } from './remote.mjs';
import { record } from './thunderbird-lib.mjs';

// SMTW_PROFILE=old uploads with .deploy.old.env instead of .deploy.env, and .env.old.local on top of .env.local,
// for example for a last release on a former server. vite.config.ts builds with the same files.
const profile = process.env.SMTW_PROFILE ?? '';
if (profile && !/^[a-z0-9-]+$/.test(profile)) {
  console.error(`SMTW_PROFILE=${profile} is not a valid profile name.`);
  process.exit(1);
}
const CONFIG_FILE = new URL(profile ? `../.deploy.${profile}.env` : '../.deploy.env', import.meta.url);
const OPERATOR_FILE = new URL('../.env.local', import.meta.url);
const PROFILE_FILE = profile ? new URL(`../.env.${profile}.local`, import.meta.url) : null;
const DIST = new URL('../dist/', import.meta.url);
// Only with this switch is the database switched on and the server accepts reports. The database is a SQLite file
// that the server's PHP creates in private/ on first use, so it needs no access data.
const withSenderDb = process.argv.includes('--sender-db');

function readEnv(file) {
  return Object.fromEntries(
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((line) => /^[A-Z_]+=/.test(line))
      .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1).trim()]),
  );
}

// Older Thunderbird packages stay downloadable forever otherwise. Only the version that updates.json on the server
// offers is kept, together with smt-watcher.xpi and updates.json. Without a readable updates.json nothing is removed.
async function removeOldPackages(remote) {
  const text = await remote.readFile('thunderbird/updates.json');
  if (text === null) {
    return 'no updates.json on the server, nothing removed';
  }
  let offered;
  try {
    offered = Object.values(JSON.parse(text).addons ?? {})[0]?.updates?.at(-1)?.version;
  } catch {
    offered = undefined;
  }
  if (typeof offered !== 'string' || !/^\d+\.\d+\.\d+$/.test(offered)) {
    return 'updates.json names no version, nothing removed';
  }
  const files = (await remote.list('thunderbird')).filter((file) => file.isFile);
  const keep = `smt-watcher-${offered}.xpi`;
  if (!files.some((file) => file.name === keep)) {
    return `${keep} is missing on the server, nothing removed`;
  }
  const old = files.filter((file) => /^smt-watcher-\d+\.\d+\.\d+\.xpi$/.test(file.name) && file.name !== keep);
  for (const file of old) {
    await remote.remove(`thunderbird/${file.name}`);
  }
  return `kept ${keep}, removed ${old.length} older package${old.length === 1 ? '' : 's'}`;
}

// private/ holds the database, the keys and the settings and must never be served. Each file must answer 403 or 404;
// anything else, including a network error, fails the deploy. Bodies are discarded unread.
const PRIVATE_PATHS = ['private/', 'private/smtw.sqlite', 'private/secret.php', 'private/day-key.php', 'private/config.php', 'private/contact.php', 'private/common.php', 'private/contact-rate.json', 'private/last-cleanup'];
async function checkPrivateClosed(siteUrl) {
  const open = [];
  for (const path of PRIVATE_PATHS) {
    const url = new URL(path, siteUrl);
    try {
      const response = await fetch(url, { cache: 'no-store' });
      await response.body?.cancel();
      if (response.status !== 403 && response.status !== 404) {
        open.push(`${url} answered ${response.status}`);
      }
    } catch (error) {
      open.push(`${url} could not be checked: ${error.message}`);
    }
  }
  return open;
}

const phpString =(value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

if (!existsSync(CONFIG_FILE) || (PROFILE_FILE && !existsSync(PROFILE_FILE))) {
  console.error(profile ? `SMTW_PROFILE=${profile} needs .deploy.${profile}.env and .env.${profile}.local.` : '.deploy.env is missing. Copy .deploy.env.example and fill it in.');
  process.exit(1);
}
const config = readEnv(CONFIG_FILE);
const missing = missingSettings(config);
if (missing.length > 0) {
  console.error(`${profile ? `.deploy.${profile}.env` : '.deploy.env'} lacks: ${missing.join(', ')}`);
  process.exit(1);
}
// Optional: private/ outside the web root, e.g. FTP_DIR=/smtw/ and PRIVATE_DIR=/smtw-private/. Then nothing in it can be
// served even if the server ignored .htaccess. private-dir.php in the web root tells PHP where it is.
const privateDir = config.PRIVATE_DIR ? posix.normalize(`${config.PRIVATE_DIR}/`) : '';
const privatePath = privateDir ? posix.relative(posix.normalize(`${config.FTP_DIR}/`), privateDir) : '';
if (privateDir && (!privateDir.startsWith('/') || !config.FTP_DIR.startsWith('/') || !privatePath.startsWith('../'))) {
  console.error('PRIVATE_DIR and FTP_DIR in .deploy.env must be absolute FTP paths, and PRIVATE_DIR must lie outside FTP_DIR.');
  process.exit(1);
}
const privateRemote = privateDir || 'private/';
// The contact form sends to the operator's address from .env.local, which the build also used for the imprint.
const operatorEnv = { ...(existsSync(OPERATOR_FILE) ? readEnv(OPERATOR_FILE) : {}), ...(PROFILE_FILE ? readEnv(PROFILE_FILE) : {}) };
const operatorEmail = operatorEnv.VITE_OPERATOR_EMAIL;
if (!operatorEmail) {
  console.error('.env.local lacks VITE_OPERATOR_EMAIL. Copy .env.example to .env.local and fill it in.');
  process.exit(1);
}
// Optional sender of the contact form, e.g. noreply@ of the site's own domain. Without it, mail is sent from the operator's address.
const mailFrom = operatorEnv.MAIL_FROM ?? '';
if (mailFrom && !/^[^\s@]+@[^\s@]+$/.test(mailFrom)) {
  console.error('MAIL_FROM in .env.local is not an e-mail address.');
  process.exit(1);
}
// The live address, used after the upload to check that private/ stays closed.
const siteUrl = operatorEnv.VITE_SITE_URL;
if (!siteUrl || !/^https:\/\/[^/]+\/$/.test(siteUrl)) {
  console.error('.env.local lacks VITE_SITE_URL as https://host/ . The deploy checks private/ there.');
  process.exit(1);
}
if (!existsSync(new URL('index.html', DIST)) || !existsSync(new URL('private/lists.php', DIST))) {
  console.error('dist/index.html or dist/private/lists.php is missing. Run npm run build first.');
  process.exit(1);
}

let remote;
try {
  console.log(`Connecting over ${describe(config)}`);
  remote = await connect(config);
  if (privateDir) {
    // Everything but private/ goes to the web root, private/ to its own folder.
    await remote.uploadDir(fileURLToPath(DIST), '.', ['private']);
    await remote.uploadDir(fileURLToPath(new URL('private/', DIST)), privateDir);
    await remote.writeFile('private-dir.php', `<?php return __DIR__ . ${phpString(`/${privatePath.replace(/\/$/, '')}`)};\n`);
    if ((await remote.list()).some((file) => file.name === 'private')) {
      console.warn(`private/ is still in the web root. Move its database and keys to ${privateDir}, then delete it by hand.`);
    }
  } else {
    await remote.uploadDir(fileURLToPath(DIST));
    // A former private-dir.php would still send PHP elsewhere.
    await remote.remove('private-dir.php');
  }
  // File names change with each build, so older ones pile up. Only unused files in assets/ are removed, and only after the new pages are online.
  const current = new Set(readdirSync(new URL('assets/', DIST)));
  const stale = (await remote.list('assets')).filter((file) => file.isFile && !current.has(file.name));
  for (const file of stale) {
    await remote.remove(`assets/${file.name}`);
  }
  console.log(`Removed ${stale.length} unused files from assets/`);
  const contactSettings = `'email' => ${phpString(operatorEmail)}` + (mailFrom ? `, 'mail_from' => ${phpString(mailFrom)}` : '');
  await remote.writeFile(`${privateRemote}contact.php`, `<?php return [${contactSettings}];\n`);
  if (withSenderDb) {
    await remote.writeFile(`${privateRemote}config.php`, `<?php return ['enabled' => true];\n`);
  }
  console.log(`Uploaded dist/ to ${config.FTP_DIR}${privateDir ? ` and private/ to ${privateDir}` : ''}${withSenderDb ? ' with the sender database on' : ''}`);
  console.log(`Thunderbird packages: ${await removeOldPackages(remote)}`);
  // scripts/thunderbird-release.mjs packaged the extension for this deploy only if it changed. Now that it is online, it counts as released.
  if (existsSync(new URL('thunderbird/updates.json', DIST))) {
    console.log(`Recorded Thunderbird ${record()} as released. Commit extensions/thunderbird/released.json with the release.`);
  }
} catch (error) {
  // Only the message: the access data must not end up in a log.
  console.error(`Upload failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  remote?.close();
}

if (!process.exitCode) {
  const open = await checkPrivateClosed(siteUrl);
  if (open.length > 0) {
    console.error(`private/ is NOT closed to the web. Fix this at once:\n  ${open.join('\n  ')}`);
    process.exitCode = 1;
  } else {
    console.log(`Checked ${PRIVATE_PATHS.length} paths in private/: all closed (403/404)`);
  }
  // lookup.php loads private/common.php before it looks at the request, so 405 shows that PHP found private/.
  // private-dir.php only returns the path and must print nothing.
  const problems = [];
  try {
    const lookup = await fetch(new URL('api/lookup.php', siteUrl), { cache: 'no-store' });
    await lookup.body?.cancel();
    if (lookup.status !== 405) problems.push(`api/lookup.php answered ${lookup.status} instead of 405: PHP may not find private/.`);
    if (privateDir) {
      const pointer = await fetch(new URL('private-dir.php', siteUrl), { cache: 'no-store' });
      if ((await pointer.text()) !== '') problems.push('private-dir.php printed something. It must only return the path.');
    }
  } catch (error) {
    problems.push(`The PHP check failed: ${error.message}`);
  }
  if (problems.length > 0) {
    console.error(problems.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`PHP finds private/${privateDir ? ` in ${privateDir}` : ''}`);
  }
}

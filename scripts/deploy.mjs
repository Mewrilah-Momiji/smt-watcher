// Uploads the built page in dist/ over encrypted FTP. Access data stays in .deploy.env, which Git ignores.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { Readable, Writable } from 'node:stream';
import { Client } from 'basic-ftp';
import { record } from './thunderbird-lib.mjs';

const CONFIG_FILE = new URL('../.deploy.env', import.meta.url);
const OPERATOR_FILE = new URL('../.env.local', import.meta.url);
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
async function removeOldPackages(client) {
  const chunks = [];
  try {
    await client.downloadTo(new Writable({ write(chunk, _encoding, done) { chunks.push(chunk); done(); } }), 'thunderbird/updates.json');
  } catch {
    return 'no updates.json on the server, nothing removed';
  }
  let offered;
  try {
    offered = Object.values(JSON.parse(Buffer.concat(chunks).toString('utf8')).addons ?? {})[0]?.updates?.at(-1)?.version;
  } catch {
    offered = undefined;
  }
  if (typeof offered !== 'string' || !/^\d+\.\d+\.\d+$/.test(offered)) {
    return 'updates.json names no version, nothing removed';
  }
  const files = (await client.list('thunderbird')).filter((file) => file.isFile);
  const keep = `smt-watcher-${offered}.xpi`;
  if (!files.some((file) => file.name === keep)) {
    return `${keep} is missing on the server, nothing removed`;
  }
  const old = files.filter((file) => /^smt-watcher-\d+\.\d+\.\d+\.xpi$/.test(file.name) && file.name !== keep);
  for (const file of old) {
    await client.remove(`thunderbird/${file.name}`);
  }
  return `kept ${keep}, removed ${old.length} older package${old.length === 1 ? '' : 's'}`;
}

const phpString = (value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

if (!existsSync(CONFIG_FILE)) {
  console.error('.deploy.env is missing. Copy .deploy.env.example and fill it in.');
  process.exit(1);
}
const config = readEnv(CONFIG_FILE);
const missing = ['FTP_HOST', 'FTP_USER', 'FTP_PASSWORD', 'FTP_DIR'].filter((key) => !config[key]);
if (missing.length > 0) {
  console.error(`.deploy.env lacks: ${missing.join(', ')}`);
  process.exit(1);
}
// The contact form sends to the operator's address from .env.local, which the build also used for the imprint.
const operatorEmail = existsSync(OPERATOR_FILE) ? readEnv(OPERATOR_FILE).VITE_OPERATOR_EMAIL : undefined;
if (!operatorEmail) {
  console.error('.env.local lacks VITE_OPERATOR_EMAIL. Copy .env.example to .env.local and fill it in.');
  process.exit(1);
}
if (!existsSync(new URL('index.html', DIST)) || !existsSync(new URL('private/lists.php', DIST))) {
  console.error('dist/index.html or dist/private/lists.php is missing. Run npm run build first.');
  process.exit(1);
}

const client = new Client(30_000);
try {
  // Refuses unencrypted connections and invalid certificates.
  await client.access({ host: config.FTP_HOST, user: config.FTP_USER, password: config.FTP_PASSWORD, secure: true });
  await client.ensureDir(config.FTP_DIR);
  await client.uploadFromDir(DIST.pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  // File names change with each build, so older ones pile up. Only unused files in assets/ are removed, and only after the new pages are online.
  const current = new Set(readdirSync(new URL('assets/', DIST)));
  const stale = (await client.list('assets')).filter((file) => file.isFile && !current.has(file.name));
  for (const file of stale) {
    await client.remove(`assets/${file.name}`);
  }
  console.log(`Removed ${stale.length} unused files from assets/`);
  await client.uploadFrom(Readable.from([`<?php return ['email' => ${phpString(operatorEmail)}];\n`]), 'private/contact.php');
  if (withSenderDb) {
    await client.uploadFrom(Readable.from([`<?php return ['enabled' => true];\n`]), 'private/config.php');
  }
  console.log(`Uploaded dist/ to ${config.FTP_DIR}${withSenderDb ? ' with the sender database on' : ''}`);
  console.log(`Thunderbird packages: ${await removeOldPackages(client)}`);
  // scripts/thunderbird-release.mjs packaged the extension for this deploy only if it changed. Now that it is online, it counts as released.
  if (existsSync(new URL('thunderbird/updates.json', DIST))) {
    console.log(`Recorded Thunderbird ${record()} as released. Commit extensions/thunderbird/released.json with the release.`);
  }
} catch (error) {
  // Only the message: the access data must not end up in a log.
  console.error(`Upload failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  client.close();
}

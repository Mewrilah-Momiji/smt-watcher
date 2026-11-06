// Reads the sender database through a temporary script, which it removes afterwards, and saves the counts per group
// as JSON to the file given as argument (outside Git). Reporters stay out: source hashes and rate limits are not read.
//   node scripts/seed/export-db.mjs <file.json>
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { Client } from 'basic-ftp';

const target = process.argv[2];
if (!target) throw new Error('Usage: node scripts/seed/export-db.mjs <file.json>');

const readEnv = (file) => Object.fromEntries(
  readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1).trim()]),
);
const env = readEnv('.deploy.env');
const { VITE_SITE_URL: site } = readEnv('.env.local');
if (!/^https:\/\/[^/]+\/$/.test(site ?? '')) throw new Error('.env.local lacks VITE_SITE_URL (https://host/). See .env.example.');
const SITE = `${site}api/`;
const token = randomBytes(32).toString('hex');
const name = `export-${randomBytes(12).toString('hex')}.php`;
const php = readFileSync(new URL('./export.php', import.meta.url), 'utf8').replace('%TOKEN_HASH%', createHash('sha256').update(token).digest('hex'));

const client = new Client(30_000);
let failed = false;
try {
  await client.access({ host: env.FTP_HOST, user: env.FTP_USER, password: env.FTP_PASSWORD, secure: true });
  await client.cd(env.FTP_DIR);
  await client.uploadFrom(Readable.from([php]), `api/${name}`);
  const response = await fetch(SITE + name, { method: 'POST', headers: { 'X-Export-Token': token } });
  const body = await response.text();
  if (response.ok) {
    const data = JSON.parse(body);
    writeFileSync(target, `${JSON.stringify(data, null, 1)}\n`);
    const real = data.groups.filter((group) => group.sources > 0).length;
    console.log(`export ${response.status}: ${data.groups.length} groups, ${real} with real reports, last report ${data.lastReport}`);
  } else {
    console.error('export', response.status, body);
    failed = true;
  }
} catch (error) {
  console.error(`Export failed: ${error.message}`);
  failed = true;
} finally {
  try {
    await client.remove(`api/${name}`);
    console.log('temporary script removed');
  } catch (error) {
    console.error(`REMOVE BY HAND: api/${name}: ${error.message}`);
    failed = true;
  }
  client.close();
}
const after = await fetch(SITE + name, { method: 'POST', headers: { 'X-Export-Token': token } }).catch(() => null);
console.log('script afterwards', after?.status);
process.exitCode = failed || after?.status !== 404 ? 1 : 0;

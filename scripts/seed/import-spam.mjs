// Loads starting data into the sender database through a temporary script, which it removes afterwards.
// The file is seed-spam.json (the operator's own spam) or the one given as argument, such as seed-public.json
// (public collections). Both stay out of Git. A group that is in both files keeps the count of the file imported last.
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { Client } from 'basic-ftp';

const readEnv = (file) => Object.fromEntries(
  readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1).trim()]),
);
const env = readEnv('.deploy.env');
// The page's address comes from .env.local, like the operator's details.
const { VITE_SITE_URL: site } = readEnv('.env.local');
if (!/^https:\/\/[^/]+\/$/.test(site ?? '')) throw new Error('.env.local lacks VITE_SITE_URL (https://host/). See .env.example.');
const SITE = `${site}api/`;
const groups = readFileSync(new URL(`../../${process.argv[2] ?? 'seed-spam.json'}`, import.meta.url), 'utf8');
const token = randomBytes(32).toString('hex');
const name = `seed-${randomBytes(12).toString('hex')}.php`;
const php = readFileSync(new URL('./import.php', import.meta.url), 'utf8').replace('%TOKEN_HASH%', createHash('sha256').update(token).digest('hex'));

const client = new Client(30_000);
let failed = false;
try {
  await client.access({ host: env.FTP_HOST, user: env.FTP_USER, password: env.FTP_PASSWORD, secure: true });
  await client.cd(env.FTP_DIR);
  await client.uploadFrom(Readable.from([php]), `api/${name}`);
  const response = await fetch(SITE + name, { method: 'POST', headers: { 'X-Import-Token': token, 'Content-Type': 'application/json' }, body: groups });
  console.log('import', response.status, await response.text());
  failed = !response.ok;
} catch (error) {
  console.error(`Import failed: ${error.message}`);
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
const after = await fetch(SITE + name, { method: 'POST', headers: { 'X-Import-Token': token } }).catch(() => null);
console.log('script afterwards', after?.status);
process.exitCode = failed || after?.status !== 404 ? 1 : 0;

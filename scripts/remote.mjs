// The server as the deploy and seed scripts reach it, with access data from .deploy.env (Git ignores it):
// - SSH with a key from the ssh-agent: SSH_HOST, SSH_USER and SSH_ROOT, the account's folder on the server
//   (at All-Inkl /www/htdocs/<account>). Files go up as a tar stream that the server unpacks. No password is stored.
// - FTPS with a password: FTP_HOST, FTP_USER, FTP_PASSWORD. Refuses unencrypted connections and invalid certificates.
// Paths are written as the FTP user sees them: relative ones inside FTP_DIR (the web root), absolute ones from the
// account's root, such as PRIVATE_DIR. SSH puts SSH_ROOT in front of both.
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, posix } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { Client } from 'basic-ftp';

// On Windows, only the system's OpenSSH reaches the Windows ssh-agent; the ssh of Git Bash does not.
const SYSTEM = process.env.SystemRoot ?? 'C:\\Windows';
const SSH = process.platform === 'win32' ? join(SYSTEM, 'System32', 'OpenSSH', 'ssh.exe') : 'ssh';
const TAR = process.platform === 'win32' ? join(SYSTEM, 'System32', 'tar.exe') : 'tar';

const quote = (value) => `'${value.replace(/'/g, `'\\''`)}'`;

export function describe(config) {
  return config.SSH_HOST ? `SSH ${config.SSH_USER}@${config.SSH_HOST}` : `FTPS ${config.FTP_HOST}`;
}

/** Names the settings that are missing for the chosen way, so that the caller can stop before connecting. */
export function missingSettings(config) {
  const keys = config.SSH_HOST ? ['SSH_HOST', 'SSH_USER', 'SSH_ROOT', 'FTP_DIR'] : ['FTP_HOST', 'FTP_USER', 'FTP_PASSWORD', 'FTP_DIR'];
  return keys.filter((key) => !config[key]);
}

export async function connect(config) {
  return config.SSH_HOST ? connectSsh(config) : connectFtp(config);
}

async function connectFtp(config) {
  const client = new Client(30_000);
  await client.access({ host: config.FTP_HOST, user: config.FTP_USER, password: config.FTP_PASSWORD, secure: true });
  // The web root becomes the working folder, so relative paths land there.
  await client.ensureDir(config.FTP_DIR);
  return {
    async uploadDir(local, remote = '.', skip = []) {
      if (skip.length === 0) {
        await client.uploadFromDir(local, remote === '.' ? undefined : remote);
        return;
      }
      for (const entry of readdirSync(local, { withFileTypes: true })) {
        if (skip.includes(entry.name)) continue;
        const target = remote === '.' ? entry.name : posix.join(remote, entry.name);
        await (entry.isDirectory() ? client.uploadFromDir(join(local, entry.name), target) : client.uploadFrom(join(local, entry.name), target));
      }
    },
    async writeFile(path, text) {
      await client.uploadFrom(Readable.from([text]), path);
    },
    async readFile(path) {
      const chunks = [];
      try {
        await client.downloadTo(new Writable({ write(chunk, _encoding, done) { chunks.push(chunk); done(); } }), path);
      } catch {
        return null;
      }
      return Buffer.concat(chunks).toString('utf8');
    },
    async list(path = '.') {
      try {
        return (await client.list(path === '.' ? undefined : path)).map((file) => ({ name: file.name, isFile: file.isFile }));
      } catch {
        return [];
      }
    },
    async remove(path) {
      await client.remove(path).catch(() => {});
    },
    close() {
      client.close();
    },
  };
}

async function connectSsh(config) {
  const root = posix.normalize(`${config.SSH_ROOT}/`);
  const web = posix.join(root, config.FTP_DIR);
  const resolve = (path) => posix.join(path.startsWith('/') ? root : web, path);
  // BatchMode: never ask for a password. StrictHostKeyChecking: only a server already in known_hosts.
  const args = ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', `${config.SSH_USER}@${config.SSH_HOST}`];
  const run = (command, input) => {
    const result = spawnSync(SSH, [...args, command], { input, maxBuffer: 16 * 1024 * 1024 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`ssh: ${String(result.stderr).trim() || `exit ${result.status}`}`);
    return String(result.stdout);
  };
  run(`mkdir -p ${quote(web)}`);
  return {
    async uploadDir(local, remote = '.', skip = []) {
      const entries = readdirSync(local).filter((name) => !skip.includes(name));
      if (entries.length === 0) return;
      const target = resolve(remote);
      const tar = spawn(TAR, ['-C', local, '-cf', '-', ...entries], { stdio: ['ignore', 'pipe', 'inherit'] });
      // GNU tar on the server ignores the Windows-specific headers that bsdtar writes, instead of warning about each.
      const ssh = spawn(SSH, [...args, `mkdir -p ${quote(target)} && tar -xf - -C ${quote(target)} --no-same-owner --warning=no-unknown-keyword`], { stdio: ['pipe', 'inherit', 'inherit'] });
      tar.stdout.pipe(ssh.stdin);
      const done = (child, name) => new Promise((ok, fail) => {
        child.on('error', fail);
        child.on('close', (code) => (code === 0 ? ok() : fail(new Error(`${name} exited with ${code}`))));
      });
      await Promise.all([done(tar, 'tar'), done(ssh, 'ssh')]);
    },
    async writeFile(path, text) {
      const target = resolve(path);
      run(`mkdir -p ${quote(posix.dirname(target))} && cat > ${quote(target)}`, text);
    },
    async readFile(path) {
      try {
        return run(`cat ${quote(resolve(path))}`);
      } catch {
        return null;
      }
    },
    async list(path = '.') {
      const out = run(`cd ${quote(resolve(path))} 2>/dev/null || exit 0; for f in * .[!.]*; do [ -e "$f" ] || continue; if [ -d "$f" ]; then echo "d $f"; else echo "f $f"; fi; done`);
      return out.split('\n').filter(Boolean).map((line) => ({ name: line.slice(2), isFile: line[0] === 'f' }));
    },
    async remove(path) {
      run(`rm -f -- ${quote(resolve(path))}`);
    },
    close() {},
  };
}

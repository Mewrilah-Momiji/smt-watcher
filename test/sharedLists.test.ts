import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ASSESSMENT_LEVELS, AUTH_RESULTS, DOMAIN_PATTERN, FREEMAIL_DOMAINS, MAX_LINK_DOMAINS, serverListsPhp, VERDICTS } from '../src/core/sharedLists';

function hasPhp(): boolean {
  try {
    execFileSync('php', ['-v'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe('serverListsPhp', () => {
  it('lists every free mail service', () => {
    const php = serverListsPhp();
    for (const domain of FREEMAIL_DOMAINS) expect(php).toContain(`'${domain}'`);
  });

  it('gives report.php a database column for each level and verdict', () => {
    const script = readFileSync(new URL('../public/api/report.php', import.meta.url), 'utf8');
    const keys = (name: string) => [...new RegExp(`const ${name} = \\[(.*?)\\];`).exec(script)![1].matchAll(/'([a-z-]+)' =>/g)].map((match) => match[1]);
    expect(keys('LEVEL_COLUMNS')).toEqual([...ASSESSMENT_LEVELS]);
    expect(keys('VERDICT_COLUMNS')).toEqual([...VERDICTS]);
  });

  // PHP is not needed for the build, so this only runs where it is installed.
  it.runIf(hasPhp())('reads back in PHP as the same lists and pattern', () => {
    const dir = mkdtempSync(join(tmpdir(), 'smtw-lists-'));
    const file = join(dir, 'lists.php');
    writeFileSync(file, serverListsPhp());
    const code = `require ${JSON.stringify(file)}; echo json_encode([ASSESSMENT_LEVELS, VERDICTS, AUTH_RESULTS, MAX_LINK_DOMAINS, FREEMAIL_DOMAINS, preg_match(DOMAIN_PATTERN, 'mail.example.co.uk'), preg_match(DOMAIN_PATTERN, 'localhost')]);`;
    const result = JSON.parse(execFileSync('php', ['-r', code], { encoding: 'utf8' }));
    expect(result).toEqual([[...ASSESSMENT_LEVELS], [...VERDICTS], [...AUTH_RESULTS], MAX_LINK_DOMAINS, [...FREEMAIL_DOMAINS], 1, 0]);
    expect(DOMAIN_PATTERN.test('mail.example.co.uk')).toBe(true);
    expect(DOMAIN_PATTERN.test('localhost')).toBe(false);
  });
});

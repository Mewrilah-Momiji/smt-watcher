// Lists that the page and the server's PHP both need. The build writes them to private/lists.php, so that there is
// only one source. This module imports nothing, as vite.config.ts loads it in Node.

export const ASSESSMENT_LEVELS = ['many-signs', 'some-signs', 'no-signs'] as const;
export const VERDICTS = ['spam', 'legit', 'unsure'] as const;
export const AUTH_RESULTS = ['pass', 'fail', 'softfail', 'none', 'other'] as const;

/** A report names at most this many link domains, and the server rejects more. */
export const MAX_LINK_DOMAINS = 10;

/** The form of a domain that a report may name. */
export const DOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export const FREEMAIL_DOMAINS: ReadonlySet<string> = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'yahoo.de', 'gmx.de', 'gmx.net', 'gmx.com', 'web.de', 't-online.de', 'aol.com', 'icloud.com', 'mail.ru', 'yandex.com', 'yandex.ru', 'proton.me', 'protonmail.com', 'qq.com', '163.com', 'comcast.net', 'att.net', 'sbcglobal.net', 'bellsouth.net', 'verizon.net', 'cox.net', 'charter.net', 'optonline.net', 'earthlink.net', 'rogers.com', 'shaw.ca', 'sympatico.ca', 'bell.net', 'telus.net', 'videotron.ca', 'msn.com', 'ymail.com', 'juno.com', 'centurylink.net', 'frontiernet.net', 'windstream.net']);

const phpString = (value: string): string => `'${value.replace(/[\\']/g, '\\$&')}'`;
const phpList = (values: Iterable<string>): string => `[${[...values].map(phpString).join(', ')}]`;

/** The PHP file with these lists. Only private/common.php includes it. */
export function serverListsPhp(): string {
  return [
    '<?php',
    'declare(strict_types=1);',
    '',
    '// Generated from src/core/sharedLists.ts at build time. Change the lists there, not here.',
    `const ASSESSMENT_LEVELS = ${phpList(ASSESSMENT_LEVELS)};`,
    `const VERDICTS = ${phpList(VERDICTS)};`,
    `const AUTH_RESULTS = ${phpList(AUTH_RESULTS)};`,
    `const MAX_LINK_DOMAINS = ${MAX_LINK_DOMAINS};`,
    `const DOMAIN_PATTERN = ${phpString(`/${DOMAIN_PATTERN.source}/`)};`,
    `const FREEMAIL_DOMAINS = ${phpList(FREEMAIL_DOMAINS)};`,
    '',
  ].join('\n');
}

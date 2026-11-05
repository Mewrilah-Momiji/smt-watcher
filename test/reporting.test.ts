import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildReport } from '../src/core/headers';
import { findPhoneCandidates, htmlToText, parsePhoneInput } from '../src/core/phones';
import { buildEmailReport, buildFormValues, formatReceivedAt, suggestBodies } from '../src/core/reporting';
import { COUNTRIES, defaultCountry, localized } from '../src/data/reportingBodies';

const numbers = (text: string, country = 'DE') => findPhoneCandidates(text, country).map((candidate) => candidate.normalized);
const germany = COUNTRIES[0];
const ids = (reportCase: Parameters<typeof suggestBodies>[1], hasPhone: boolean) =>
  suggestBodies(germany, reportCase, hasPhone).bodies.map((body) => body.id);

describe('countries', () => {
  const austria = COUNTRIES.find((country) => country.code === 'AT')!;

  it('suggests only checked bodies for Austria, and says when there is none', () => {
    expect(suggestBodies(austria, 'advertising', false).bodies.map((body) => body.id)).toEqual(['at-fernmeldebuero']);
    expect(suggestBodies(austria, 'phishing', false).bodies.map((body) => body.id)).toEqual(['at-watchlist', 'at-bk-cybercrime']);
    expect(suggestBodies(austria, 'illegal-content', false)).toEqual({ bodies: [], unchecked: true });
  });

  it('suggests only checked bodies for Switzerland, and says when there is none', () => {
    const switzerland = COUNTRIES.find((country) => country.code === 'CH')!;
    expect(suggestBodies(switzerland, 'phishing', false).bodies.map((body) => body.id)).toEqual(['ch-antiphishing', 'ch-bacs-form']);
    expect(suggestBodies(switzerland, 'illegal-content', false).bodies.map((body) => body.id)).toEqual(['ch-clickandstop']);
    expect(suggestBodies(switzerland, 'advertising', true)).toEqual({ bodies: [], unchecked: true });
  });

  it('offers no body for other countries and marks every case as not checked', () => {
    const other = COUNTRIES.at(-1)!;
    for (const reportCase of ['advertising', 'illegal-content', 'phishing'] as const) {
      expect(suggestBodies(other, reportCase, true)).toEqual({ bodies: [], unchecked: true });
    }
  });

  it('gives every body a secure source and a check date', () => {
    for (const body of COUNTRIES.flatMap((country) => country.bodies)) {
      expect(body.source).toMatch(/^https:\/\//);
      expect(body.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('suggests checked bodies for France, the United Kingdom, Ireland and Italy', () => {
    const suggested = (code: string, reportCase: Parameters<typeof suggestBodies>[1]) =>
      suggestBodies(COUNTRIES.find((country) => country.code === code)!, reportCase, false);
    expect(suggested('FR', 'advertising').bodies.map((body) => body.id)).toEqual(['fr-signal-spam']);
    expect(suggested('FR', 'phishing').bodies.map((body) => body.id)).toEqual(['fr-signal-spam', 'fr-phishing-initiative']);
    expect(suggested('FR', 'illegal-content').bodies.map((body) => body.id)).toEqual(['fr-pharos']);
    expect(suggested('GB', 'advertising').bodies.map((body) => body.id)).toEqual(['gb-ico']);
    expect(suggested('GB', 'phishing').bodies.map((body) => body.id)).toEqual(['gb-ncsc']);
    expect(suggested('GB', 'illegal-content').bodies.map((body) => body.id)).toEqual(['gb-iwf']);
    expect(suggested('IE', 'advertising').bodies.map((body) => body.id)).toEqual(['ie-dpc']);
    expect(suggested('IE', 'illegal-content').bodies.map((body) => body.id)).toEqual(['ie-hotline']);
    expect(suggested('IE', 'phishing')).toEqual({ bodies: [], unchecked: true });
    expect(suggested('IT', 'advertising').bodies.map((body) => body.id)).toEqual(['it-garante']);
    expect(suggested('IT', 'phishing').bodies.map((body) => body.id)).toEqual(['it-polizia-postale']);
    expect(suggested('IT', 'illegal-content').bodies.map((body) => body.id)).toEqual(['it-polizia-postale']);
  });

  it('suggests checked bodies for Belgium, the Netherlands, Poland, Denmark and the Czech Republic', () => {
    const suggested = (code: string, reportCase: Parameters<typeof suggestBodies>[1]) =>
      suggestBodies(COUNTRIES.find((country) => country.code === code)!, reportCase, false);
    expect(suggested('BE', 'phishing').bodies.map((body) => body.id)).toEqual(['be-safeonweb']);
    expect(suggested('BE', 'illegal-content').bodies.map((body) => body.id)).toEqual(['be-child-focus']);
    expect(suggested('BE', 'advertising')).toEqual({ bodies: [], unchecked: true });
    expect(suggested('NL', 'phishing').bodies.map((body) => body.id)).toEqual(['nl-fraudehelpdesk']);
    expect(suggested('NL', 'illegal-content').bodies.map((body) => body.id)).toEqual(['nl-offlimits']);
    expect(suggested('NL', 'advertising')).toEqual({ bodies: [], unchecked: true });
    expect(suggested('PL', 'phishing').bodies.map((body) => body.id)).toEqual(['pl-cert']);
    expect(suggested('PL', 'illegal-content').bodies.map((body) => body.id)).toEqual(['pl-dyzurnet']);
    expect(suggested('PL', 'advertising')).toEqual({ bodies: [], unchecked: true });
    expect(suggested('DK', 'advertising').bodies.map((body) => body.id)).toEqual(['dk-spamklage-dansk', 'dk-spamklage-int']);
    expect(suggested('DK', 'phishing')).toEqual({ bodies: [], unchecked: true });
    expect(suggested('DK', 'illegal-content').bodies.map((body) => body.id)).toEqual(['dk-anmelddet']);
    expect(suggested('CZ', 'advertising').bodies.map((body) => body.id)).toEqual(['cz-uoou']);
    expect(suggested('CZ', 'phishing').bodies.map((body) => body.id)).toEqual(['cz-stoponline-threats']);
    expect(suggested('CZ', 'illegal-content').bodies.map((body) => body.id)).toEqual(['cz-stoponline-children']);
  });

  it('suggests checked bodies for Luxembourg and the second round of countries', () => {
    const ids = (code: string, reportCase: Parameters<typeof suggestBodies>[1]) => {
      const suggestion = suggestBodies(COUNTRIES.find((country) => country.code === code)!, reportCase, false);
      return suggestion.unchecked ? 'not checked' : suggestion.bodies.map((body) => body.id).join(',');
    };
    const expected: Record<string, [string, string, string]> = {
      LU: ['not checked', 'lu-circl', 'lu-stopline'],
      SK: ['not checked', 'sk-cert', 'sk-stopline'],
      HU: ['not checked', 'hu-internet-hotline', 'hu-internet-hotline'],
      SI: ['not checked', 'si-cert', 'si-spletno-oko'],
      SE: ['se-konsumentverket', 'not checked', 'se-ecpat'],
      FI: ['not checked', 'fi-traficom', 'fi-nettivihje'],
      NO: ['not checked', 'not checked', 'no-politiet-tips'],
      ES: ['es-aepd', 'es-incibe', 'es-incibe-hotline'],
      PT: ['pt-cnpd', 'pt-cert', 'pt-linha-internet-segura'],
    };
    for (const [code, [advertising, phishing, illegal]] of Object.entries(expected)) {
      expect([ids(code, 'advertising'), ids(code, 'phishing'), ids(code, 'illegal-content')]).toEqual([advertising, phishing, illegal]);
    }
  });

  it('suggests checked bodies for the remaining EU countries', () => {
    const ids = (code: string, reportCase: Parameters<typeof suggestBodies>[1]) => {
      const suggestion = suggestBodies(COUNTRIES.find((country) => country.code === code)!, reportCase, false);
      return suggestion.unchecked ? 'not checked' : suggestion.bodies.map((body) => body.id).join(',');
    };
    const expected: Record<string, [string, string, string]> = {
      BG: ['bg-kzp', 'bg-cert', 'bg-safenet'],
      RO: ['not checked', 'ro-dnsc-pnrisc', 'ro-esc-abuz'],
      GR: ['not checked', 'gr-safeline', 'gr-safeline'],
      CY: ['not checked', 'cy-csirt', 'not checked'],
      EE: ['not checked', 'ee-cert', 'ee-vihjeliin'],
      LV: ['lv-cert-spam', 'lv-cert', 'lv-drossinternets'],
      LT: ['not checked', 'lt-nksc', 'lt-svarus-internetas'],
      HR: ['not checked', 'hr-cert', 'hr-csi'],
      MT: ['not checked', 'not checked', 'mt-childwebalert'],
    };
    for (const [code, [advertising, phishing, illegal]] of Object.entries(expected)) {
      expect([ids(code, 'advertising'), ids(code, 'phishing'), ids(code, 'illegal-content')]).toEqual([advertising, phishing, illegal]);
    }
  });

  it('shows the English text where a body has none in the chosen language', () => {
    const poland = COUNTRIES.find((country) => country.code === 'PL')!.bodies[0];
    expect(localized(poland.purpose, 'pl')).toContain('Przyjmuje');
    expect(localized(poland.purpose, 'fr')).toBe(poland.purpose.en);
  });

  it('notes unchecked cases only where they are unchecked', () => {
    for (const country of COUNTRIES) {
      for (const reportCase of Object.keys(country.uncheckedNotes ?? {})) expect(country.uncheckedCases).toContain(reportCase);
    }
    const mexico = COUNTRIES.find((country) => country.code === 'MX')!;
    expect(suggestBodies(mexico, 'phishing', false)).toEqual({ bodies: [], unchecked: true });
    expect(mexico.uncheckedNotes?.phishing?.en).toContain('088');
  });

  it('writes Brazilian reports in Brazilian Portuguese', () => {
    const brazil = COUNTRIES.find((country) => country.code === 'BR')!;
    const body = suggestBodies(brazil, 'phishing', false).bodies[0];
    expect(body.channel).toEqual({ type: 'email', address: 'cert@cert.br' });
    const email = buildEmailReport({ report: buildReport('From: a@b.example\r\nSubject: x'), phones: [], reportCase: 'phishing' }, body.language);
    expect(email.body).toContain('gostaria de denunciar');
    expect(email.body).toContain('Cabeçalhos originais');
  });

  it('writes Japanese and Korean reports in their own languages', () => {
    const japan = COUNTRIES.find((country) => country.code === 'JP')!;
    const phishing = suggestBodies(japan, 'phishing', false).bodies[0];
    expect(phishing.channel).toEqual({ type: 'email', address: 'info@antiphishing.jp' });
    const report = buildReport('From: a@b.example\r\nSubject: x');
    const japanese = buildEmailReport({ report, phones: [], reportCase: 'phishing' }, phishing.language);
    expect(japanese.subject).toBe('迷惑メールに関する報告');
    expect(japanese.body).toContain('フィッシング詐欺');
    const korean = buildEmailReport({ report, phones: [], reportCase: 'illegal-content' }, 'ko');
    expect(korean.body).toContain('원본 헤더');
    expect(korean.body).not.toContain('undefined');
  });

  it('writes reports in the language of each country', () => {
    const report = buildReport('From: Shop <news@shop.example>\r\nSubject: Offer\r\nDate: Mon, 02 Nov 2026 10:00:00 +0100');
    for (const country of COUNTRIES) {
      for (const body of country.bodies) expect(body.language).toBe(country.language);
    }
    const intro = (language: Parameters<typeof buildEmailReport>[1]) => buildEmailReport({ report, phones: [], reportCase: 'advertising' }, language).body;
    expect(intro('en')).toContain('I did not consent to receiving this email.');
    expect(intro('fr')).toContain('Je n’ai pas consenti à recevoir ce courriel.');
    expect(intro('it')).toContain('Non ho dato il consenso a ricevere questa e-mail.');
    expect(intro('nl')).toContain('Ik heb geen toestemming gegeven');
    expect(intro('pl')).toContain('Nie wyraziłem zgody');
    expect(intro('da')).toContain('Jeg har ikke givet samtykke');
    expect(intro('cs')).toContain('nedal souhlas');
    for (const language of ['sk', 'hu', 'sl', 'sv', 'fi', 'es', 'pt', 'nb', 'bg', 'ro', 'el', 'et', 'lv', 'lt', 'hr'] as const) {
      expect(intro(language)).not.toContain('undefined');
      expect(intro(language)).not.toBe(intro('en'));
    }
  });

  it('starts with the country of the browser language, then the language alone, then Germany', () => {
    expect(defaultCountry('de-AT').code).toBe('AT');
    expect(defaultCountry('de-CH').code).toBe('CH');
    expect(defaultCountry('fr-CH').code).toBe('CH');
    expect(defaultCountry('de-DE').code).toBe('DE');
    expect(defaultCountry('en-GB').code).toBe('GB');
    expect(defaultCountry('en-IN').code).toBe('IN');
    expect(defaultCountry('ja').code).toBe('JP');
    expect(defaultCountry('ko-KR').code).toBe('KR');
    expect(defaultCountry('en-ZA').code).toBe('ZA');
    expect(defaultCountry('en-HK').code).toBe('HK');
    expect(defaultCountry('en-IE').code).toBe('IE');
    expect(defaultCountry('fr').code).toBe('FR');
    expect(defaultCountry('it-IT').code).toBe('IT');
    expect(defaultCountry('nl-BE').code).toBe('BE');
    expect(defaultCountry('fr-BE').code).toBe('BE');
    expect(defaultCountry('nl').code).toBe('NL');
    expect(defaultCountry('pl').code).toBe('PL');
    expect(defaultCountry('da').code).toBe('DK');
    expect(defaultCountry('cs').code).toBe('CZ');
    expect(defaultCountry('fr-LU').code).toBe('LU');
    expect(defaultCountry('sv').code).toBe('SE');
    expect(defaultCountry('sv-FI').code).toBe('FI');
    expect(defaultCountry('nb').code).toBe('NO');
    expect(defaultCountry('sl').code).toBe('SI');
    expect(defaultCountry('es-ES').code).toBe('ES');
    expect(defaultCountry('pt-BR').code).toBe('BR');
    expect(defaultCountry('pt-PT').code).toBe('PT');
    expect(defaultCountry('pt').code).toBe('PT');
    expect(defaultCountry('hu').code).toBe('HU');
    expect(defaultCountry('bg').code).toBe('BG');
    expect(defaultCountry('ro-RO').code).toBe('RO');
    expect(defaultCountry('el').code).toBe('GR');
    expect(defaultCountry('el-CY').code).toBe('CY');
    expect(defaultCountry('et').code).toBe('EE');
    expect(defaultCountry('lv').code).toBe('LV');
    expect(defaultCountry('lt').code).toBe('LT');
    expect(defaultCountry('hr').code).toBe('HR');
    expect(defaultCountry('en-MT').code).toBe('MT');
    expect(defaultCountry('en-US').code).toBe('US');
    expect(defaultCountry('en-CA').code).toBe('CA');
    expect(defaultCountry('fr-CA').code).toBe('CA');
    expect(defaultCountry('en').code).toBe('DE');
    expect(defaultCountry('es-MX').code).toBe('MX');
    expect(defaultCountry('es').code).toBe('ES');
    expect(defaultCountry('en-AU').code).toBe('AU');
    expect(defaultCountry('en-NZ').code).toBe('NZ');
    expect(defaultCountry('is').code).toBe('IS');
    expect(defaultCountry('es-AR').code).toBe('AR');
    expect(defaultCountry('es-CO').code).toBe('CO');
    expect(defaultCountry('es-CL').code).toBe('CL');
    expect(defaultCountry('es-UY').code).toBe('UY');
    expect(defaultCountry('ro-MD').code).toBe('MD');
    expect(defaultCountry('en-SG').code).toBe('SG');
    expect(defaultCountry('ro').code).toBe('RO');
  });
});

describe('findPhoneCandidates', () => {
  it.each([
    ['Jetzt anrufen: 0900 1234567', '+499001234567'],
    ['Tel.: 030/123 456 78', '+493012345678'],
    ['Hotline (0800) 123-4567', '+498001234567'],
    ['Call +44 20 7946 0958 today', '+442079460958'],
    ['Telefon 0049 171 2345678', '+491712345678'],
    ['Call us at +1 (212) 555-0199', '+12125550199'],
    ['Phone: +1-800-555-0199', '+18005550199'],
  ])('finds the number in %s', (text, expected) => {
    expect(numbers(text)).toEqual([expected]);
  });

  it.each([
    ['Call (212) 555-0199 now', 'US', '+12125550199'],
    ['Toll free 1-800-555-0199', 'US', '+18005550199'],
    ['Phone 02 9374 4000', 'AU', '+61293744000'],
    ['Llame al 800 468 8722', 'MX', '+528004688722'],
  ])('finds the national number in %s for %s', (text, country, expected) => {
    expect(numbers(text, country)).toEqual([expected]);
  });

  it('reads a national number as one of the chosen country', () => {
    expect(numbers('Hotline 0900 1234567', 'AT')).not.toContain('+499001234567');
  });

  it.each([
    'Bestellung 1234567890',
    'Datum: 01.11.2026 um 10:00',
    '2026-11-01',
    'Server 192.168.100.200',
    'https://example.org/0900123456789',
    'kontakt0900123456@example.org',
    'IBAN DE89370400440532013000',
    'Preis 0,99',
    '0000000000',
  ])('ignores %s', (text) => {
    expect(numbers(text)).toEqual([]);
  });

  it('marks numbers near call wording and lists them first', () => {
    const found = findPhoneCandidates('Ref 0301234567\nBitte anrufen: 0900 1234567', 'DE');
    expect(found.map((candidate) => [candidate.normalized, candidate.hasContext])).toEqual([
      ['+499001234567', true],
      ['+49301234567', false],
    ]);
  });

  it('removes duplicates', () => {
    expect(numbers('0900 1234567\n0900-1234567')).toEqual(['+499001234567']);
  });
});

describe('parsePhoneInput', () => {
  it.each([
    ['0900 1234567', '+499001234567'],
    [' (030) 123-456/78 ', '+493012345678'],
    ['+44 20 7946 0958', '+442079460958'],
    ['0049 171 2345678', '+491712345678'],
  ])('accepts %s', (input, expected) => {
    expect(parsePhoneInput(input, 'DE')).toBe(expected);
  });

  it.each(['', 'abc', '0900 CALL NOW', '1234567890', '0123', '+1234567890123456789', '0000000000', '09+001234567'])('rejects "%s"', (input) => {
    expect(parsePhoneInput(input, 'DE')).toBeNull();
  });

  it('reads national numbers in the format of the chosen country', () => {
    expect(parsePhoneInput('(212) 555-0199', 'US')).toBe('+12125550199');
    expect(parsePhoneInput('02 9374 4000', 'AU')).toBe('+61293744000');
    expect(parsePhoneInput('011 4321-0000', 'AR')).toBe('+541143210000');
    // Another country has no national format, so only international numbers count.
    expect(parsePhoneInput('0900 1234567', 'XX')).toBeNull();
    expect(parsePhoneInput('+49 900 1234567', 'XX')).toBe('+499001234567');
  });
});

describe('htmlToText', () => {
  it('drops markup and scripts', () => {
    expect(htmlToText('<style>a{}</style><p>Tel: 0900 1234567</p><script>0301234567</script>').trim()).toBe('Tel: 0900 1234567');
  });
});

describe('suggestBodies', () => {
  it('only includes the Bundesnetzagentur if a phone number exists', () => {
    expect(ids('advertising', false)).toEqual(['de-eco-general']);
    expect(ids('advertising', true)).toEqual(['de-bnetza', 'de-eco-general']);
  });

  it('uses the special address for illegal content', () => {
    expect(ids('illegal-content', false)).toEqual(['de-eco-special']);
  });

  it('sends phishing to the consumer center only', () => {
    const suggestion = suggestBodies(germany, 'phishing', true);
    expect(suggestion.bodies.map((body) => body.id)).toEqual(['de-consumer-center']);
    expect(suggestion.unchecked).toBe(false);
  });

  it('marks a case as not checked instead of guessing a body', () => {
    const suggestion = suggestBodies({ ...germany, bodies: [], uncheckedCases: ['phishing'] }, 'phishing', false);
    expect(suggestion.bodies).toEqual([]);
    expect(suggestion.unchecked).toBe(true);
  });
});

describe('reports', () => {
  const raw = readFileSync(new URL('./fixtures/advertising.eml', import.meta.url), 'latin1').split(/\r?\n\r?\n/)[0];
  const report = buildReport(raw);
  const input = { report, phones: ['+499001234567'], reportCase: 'advertising' as const };

  it('adds the original headers to the email report', () => {
    const email = buildEmailReport(input, 'de');
    expect(email.body.startsWith('Guten Tag,\n\nhiermit')).toBe(true);
    expect(email.body).toContain('Original-Header');
    expect(email.body).toContain(report.rawHeaders);
    expect(email.body).toContain('+499001234567');
    expect(email.body).toContain('keine Einwilligung');
  });

  it('leaves out the consent statement and headers for phishing', () => {
    const email = buildEmailReport({ ...input, reportCase: 'phishing' }, 'de', false);
    expect(email.body).toContain('Betrugsversuch');
    expect(email.body).not.toContain('Einwilligung');
    expect(email.body).not.toContain('Original-Header');
    expect(email.body).not.toContain('Return-Path');
  });

  it('tells the user what to expect from every body before sending', () => {
    for (const body of germany.bodies) {
      expect(body.notices.en.length).toBeGreaterThan(0);
      expect(body.notices.de.length).toBe(body.notices.en.length);
      expect(body.instructions.de).not.toBe('');
    }
  });

  it('formats the date for the form and keeps its limits', () => {
    expect(formatReceivedAt(report)).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
    const long = buildFormValues({ ...input, report: { ...report, subject: 'x'.repeat(3000) } }, 'de');
    expect(long.notes.length).toBeLessThanOrEqual(2000);
    expect(long.phones).toEqual(['+499001234567']);
  });

  it('leaves the date empty if it cannot be read', () => {
    expect(formatReceivedAt({ ...report, received: [], date: 'kaputt' })).toBe('');
  });

  it('checks every body against a recorded source', () => {
    for (const body of germany.bodies) {
      expect(body.source).toMatch(/^https:\/\//);
      expect(body.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

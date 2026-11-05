import { readFileSync } from 'node:fs';
import { expect, test as base, type Locator, type Page } from '@playwright/test';
import { loadEnv } from 'vite';
import { buildMsg } from './msgFixture';

/** The country and language fields take a name or a code. An exact one counts at once, so the field may change its name. */
async function choose(field: Locator, text: string): Promise<void> {
  await field.click();
  await field.fill(text);
}

const MIME = 'message/rfc822';
const fixture = (name: string): Buffer => readFileSync(new URL(`../test/fixtures/${name}`, import.meta.url));

const test = base.extend<{ expected: RegExp | null; problems: void }>({
  expected: [null, { option: true }],
  // Every test fails on script errors, blocked content or a request that leaves the page.
  problems: [
    async ({ page, baseURL, expected }, use) => {
      const problems: string[] = [];
      page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
      page.on('console', (message) => {
        // Browsers ask for this icon on their own, and the page has none.
        if (message.type() === 'error' && !message.location().url.endsWith('/favicon.ico')) problems.push(`console: ${message.text()}`);
      });
      page.on('dialog', (dialog) => {
        problems.push(`dialog: ${dialog.message()}`);
        void dialog.dismiss();
      });
      page.on('request', (request) => {
        const url = request.url();
        if (!url.startsWith(`${baseURL}/`) && !url.startsWith('blob:')) problems.push(`request: ${url}`);
      });
      await use();
      expect(problems.filter((problem) => !expected?.test(problem))).toEqual([]);
    },
    { auto: true },
  ],
});

async function upload(page: Page, name: string, mimeType: string, buffer: Buffer): Promise<void> {
  await page.goto('/');
  await page.locator('#file').setInputFiles({ name, mimeType, buffer });
}

const openReport = (page: Page) => page.getByRole('button', { name: 'Report this email' }).click();

const cleanEmail = (subject: string, extraHeader = ''): Buffer =>
  Buffer.from(`From: Shop <news@shop.example>\r\nTo: me@example.org\r\nSubject: ${subject}\r\nDate: Mon, 02 Nov 2026 10:00:00 +0100\r\nMessage-ID: <1@shop.example>\r\nAuthentication-Results: mx.example.org; spf=pass smtp.mailfrom=shop.example; dkim=pass header.d=shop.example; dmarc=pass header.from=shop.example\r\n${extraHeader}\r\nHello.\r\n`);

test.describe('several emails and newsletters', () => {
  test('notes that unsubscribing may be enough only for a newsletter without signs', async ({ page }) => {
    await upload(page, 'news.eml', MIME, cleanEmail('News', 'List-Unsubscribe: <https://shop.example/u>\r\n'));
    await expect(page.getByText('unsubscribing may be enough')).toBeVisible();
    await upload(page, 'plain.eml', MIME, cleanEmail('Plain'));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('unsubscribing may be enough')).toHaveCount(0);
  });

  test('lists several emails by level, opens one and returns to the list', async ({ page }) => {
    await page.goto('/');
    await page.locator('#file').setInputFiles([
      { name: 'plain.eml', mimeType: MIME, buffer: cleanEmail('Plain') },
      { name: 'spoofed.eml', mimeType: MIME, buffer: fixture('spoofed.eml') },
      { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('x') },
    ]);
    await expect(page.getByRole('heading', { name: '3 emails checked' })).toBeVisible();
    const rows = page.locator('.batch-list li');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(1)).toContainText('Plain');
    await expect(rows.nth(2)).toContainText('notes.txt');
    await expect(rows.nth(0).locator('.badge')).toHaveClass(/bad/);

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save list as CSV' }).click()]);
    expect(download.suggestedFilename()).toBe('smt-watcher-list.csv');
    const csv = readFileSync(await download.path(), 'utf8');
    expect(csv).toContain('Level;Sender;Subject;Signs;File');
    expect(csv).toContain('notes.txt');

    await page.getByRole('button', { name: 'View Plain' }).click();
    await expect(page.locator('.scale')).toBeVisible();
    await page.getByRole('button', { name: 'Back to the list' }).click();
    await expect(page.getByRole('heading', { name: '3 emails checked' })).toBeVisible();

    await page.getByRole('button', { name: 'View Plain' }).click();
    await choose(page.getByRole('combobox', { name: 'Language' }), 'de');
    await page.getByRole('button', { name: 'Zurück zur Liste' }).click();
    await expect(page.locator('.batch-list li')).toHaveCount(3);
  });
});

test.describe('connection policy', () => {
  test.use({ expected: /Content Security Policy|Failed to fetch/ });

  test('allows only the lookup hosts', async ({ page }) => {
    await page.goto('/');
    const policy = page.locator('meta[http-equiv="Content-Security-Policy"]');
    await expect(policy).toHaveAttribute(
      'content',
      /connect-src https:\/\/rdap\.org https:\/\/rdap\.arin\.net https:\/\/rdap\.db\.ripe\.net https:\/\/rdap\.apnic\.net https:\/\/\*\.rdap\.apnic\.net https:\/\/rdap\.lacnic\.net https:\/\/rdap\.registro\.br https:\/\/rdap\.afrinic\.net;/,
    );
    const blocked = await page.evaluate(() => fetch('https://example.org/').then(() => false, () => true));
    expect(blocked).toBe(true);
  });
});

test.describe('page', () => {
  test('shows the start page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Is this email genuine?' })).toBeVisible();
  });

  test('keeps the chosen language and theme after a reload', async ({ page }) => {
    await page.goto('/');
    await choose(page.getByRole('combobox', { name: 'Language' }), 'de');
    await expect(page.getByRole('heading', { name: 'Ist diese E-Mail echt?' })).toBeVisible();

    const theme = page.locator('.controls button');
    await theme.click();
    const chosen = await page.locator('html').getAttribute('data-theme');
    expect(chosen).toMatch(/^(light|dark)$/);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Ist diese E-Mail echt?' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', chosen!);
  });
});

test.describe('getting an email into the page', () => {
  test('reads an .eml file without running or loading anything from it', async ({ page }) => {
    await upload(page, 'spoofed.eml', MIME, fixture('spoofed.eml'));
    await expect(page.getByText('Many signs of spam or fraud')).toBeVisible();
    await expect(page.getByText('Some signs point to a fraud attempt.')).toBeVisible();
    await expect(page.locator('#result img, #result script')).toHaveCount(0);
  });

  test('reads a source saved as .txt on a phone', async ({ page }) => {
    const source = fixture('spoofed.eml').toString('utf8').replace(/\r\n/g, '\n');
    await upload(page, 'Notiz.txt', 'text/plain', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(source)]));
    await expect(page.getByText('Many signs of spam or fraud')).toBeVisible();
    await expect(page.locator('#file')).toHaveAttribute('accept', '.msg,.eml,.txt');
  });

  test('links to the imprint and privacy policy', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Imprint' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Imprint' })).toBeVisible();
    // The operator's details are settings in .env.local, the same the build used.
    const operator = loadEnv('production', process.cwd(), 'VITE_OPERATOR_');
    await expect(page.locator('#legal')).toContainText(operator.VITE_OPERATOR_CITY);
    await expect(page.locator('#legal')).toContainText(`${operator.VITE_OPERATOR_NAME}, address as above`);
    await expect(page.locator('#legal')).not.toContainText('rdap.org');
    await page.getByRole('link', { name: 'Privacy policy' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeVisible();
    await expect(page.locator('#legal')).toContainText('rdap.org');
    await expect(page.locator('#contact')).toHaveCount(0);
    await choose(page.getByRole('combobox', { name: 'Language' }), 'de');
    await expect(page.getByRole('heading', { level: 1, name: 'Datenschutzerklärung' })).toBeVisible();
    await page.getByRole('link', { name: 'SMT Wächter' }).click();
    await expect(page.locator('#dropzone')).toBeVisible();
  });

  test('lets only the imprint send a form, and only to this site', async ({ page }) => {
    const policy = () => page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    await page.goto('/');
    expect(await policy()).toContain("form-action 'none'");
    await page.goto('/privacy.html');
    expect(await policy()).toContain("form-action 'none'");
    await page.goto('/imprint.html');
    expect(await policy()).toContain("form-action 'self'");
    await expect(page.locator('#contact')).toHaveAttribute('action', 'contact.php');
    await expect(page.locator('#contact')).toHaveAttribute('method', 'post');
  });

  test('keeps a typed contact message through a language change and shows the result', async ({ page }) => {
    await page.goto('/imprint.html');
    await page.getByRole('textbox', { name: 'Your message' }).fill('Hello');
    await choose(page.getByRole('combobox', { name: 'Language' }), 'de');
    await expect(page.getByRole('textbox', { name: 'Deine Nachricht' })).toHaveValue('Hello');

    await page.goto('/imprint.html?contact=sent#contact');
    await expect(page.getByRole('status')).toContainText('Danke');
    await page.goto('/imprint.html?contact=%3Cb%3E#contact');
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('offers no contribution and no own connection while the sender database is off', async ({ page }) => {
    await upload(page, 'spoofed.eml', MIME, fixture('spoofed.eml'));
    const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    test.skip(policy!.includes("connect-src 'self'"), 'built with the sender database');
    await expect(page.getByRole('button', { name: 'Improve the assessment' })).toHaveCount(0);
    await expect(page.getByText('Help improve the sender database')).toHaveCount(0);
  });

  test('sender database: sends only after a choice and a click, and reports a wrong assessment', async ({ page }) => {
    await upload(page, 'spoofed.eml', MIME, fixture('spoofed.eml'));
    const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    test.skip(!policy!.includes("connect-src 'self'"), 'needs a build with the sender database');
    const sent: string[] = [];
    await page.route('**/api/report.php', (route) => {
      sent.push(route.request().postData() ?? '');
      return route.fulfill({ json: { result: 'counted' } });
    });

    await page.getByRole('button', { name: 'Improve the assessment' }).click();
    await expect(page.getByRole('radio', { name: 'Legitimate' })).toBeChecked();
    await expect(page.locator('.privacy')).toContainText('Only if you choose to');
    expect(sent).toEqual([]);
    const summary = page.locator('.contribution-summary');
    await expect(summary).toContainText('Your answer: Legitimate. Also that you think the assessment is wrong.');
    await expect(summary).toContainText('Not sent: the email itself');
    await expect(summary).not.toContainText('"codes"');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'your answer has arrived' })).toBeVisible();

    const contribution = JSON.parse(sent[0]);
    expect(contribution).toMatchObject({ verdict: 'legit', assessmentWrong: true });
    expect(sent[0]).not.toContain('@');
    await expect(summary).toContainText(`Sender: the domain ${contribution.senderDomain} and`);

    // Agreeing with the page after all is no longer a wrong assessment.
    await page.getByRole('radio', { name: 'Spam or fraud' }).check();
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect.poll(() => sent.length).toBe(2);
    expect(JSON.parse(sent[1])).toMatchObject({ verdict: 'spam', assessmentWrong: false });
  });

  test('sender database: the privacy policy names it only when it is on', async ({ page }) => {
    await page.goto('/privacy.html');
    const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    const on = policy!.includes("connect-src 'self'");
    await expect(page.getByRole('heading', { name: 'Sender database' })).toHaveCount(on ? 1 : 0);
    await expect(page.locator('#legal')).toContainText(on ? 'The only exception' : 'never receives it or its content');
  });

  test('sender database: checks a sender only after a click and shows the answer as a finding', async ({ page }) => {
    await upload(page, 'spoofed.eml', MIME, fixture('spoofed.eml'));
    const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    test.skip(!policy!.includes("connect-src 'self'"), 'needs a build with the sender database');
    const sent: string[] = [];
    await page.route('**/api/lookup.php', (route) => {
      sent.push(route.request().postData() ?? '');
      return route.fulfill({ json: { result: 'reported-spam' } });
    });
    expect(sent).toEqual([]);
    await page.getByRole('button', { name: 'Check sender in the database' }).click();
    await expect(page.getByRole('button', { name: 'Check sender in the database' })).toHaveCount(0);
    expect(Object.keys(JSON.parse(sent[0]))).toEqual(['senderDomain']);
    expect(sent[0]).not.toContain('@');

    await page.locator('summary', { hasText: /^All \d+ findings/ }).click();
    await expect(page.getByText('This sender address was reported as spam')).toBeVisible();
    await choose(page.getByRole('combobox', { name: 'Language' }), 'de');
    await expect(page.getByRole('button', { name: 'Absender in der Datenbank prüfen' })).toHaveCount(0);
    expect(sent).toHaveLength(1);
  });

  test('shows the version from package.json', async ({ page }) => {
    const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
    for (const path of ['/', '/help.html', '/imprint.html', '/privacy.html']) {
      await page.goto(path);
      await expect(page.locator('.foot .version')).toHaveText(`Beta ${version}`);
    }
  });

  test('offers checked bodies per country, and says when there is none', async ({ page }) => {
    await upload(page, 'spoofed.eml', MIME, fixture('spoofed.eml'));
    await openReport(page);
    await expect(page.locator('#report-country')).toHaveValue('Germany');
    await page.getByRole('radio', { name: 'Phishing or fraud attempt' }).check();
    await expect(page.getByText('Verbraucherzentrale (Phishing-Radar)')).toBeVisible();

    await choose(page.locator('#report-country'), 'AT');
    await expect(page.getByRole('heading', { level: 1, name: 'Report this email' })).toBeVisible();
    await expect(page.getByText('Watchlist Internet')).toBeVisible();
    await expect(page.getByText('Cybercrime-Meldestelle des Bundeskriminalamts')).toBeVisible();
    await expect(page.getByText('Verbraucherzentrale (Phishing-Radar)')).toHaveCount(0);

    await choose(page.locator('#report-country'), 'US');
    await expect(page.getByText('Anti-Phishing Working Group (APWG)')).toBeVisible();
    await expect(page.getByText('Federal Trade Commission (ReportFraud.ftc.gov)')).toBeVisible();
    await choose(page.locator('#report-country'), 'CA');
    await expect(page.getByText('Canadian Anti-Fraud Centre', { exact: true })).toBeVisible();
    await choose(page.locator('#report-country'), 'MX');
    await expect(page.getByText('We know no checked reporting body for this case in Mexico.')).toBeVisible();
    await expect(page.getByText(/by phone only, at 088/)).toBeVisible();
    await choose(page.locator('#report-country'), 'BR');
    await expect(page.getByText(/Reports to bodies there are in Brazilian Portuguese/)).toBeVisible();
    await expect(page.getByText('CERT.br (phishing)', { exact: true })).toBeVisible();
    await choose(page.locator('#report-country'), 'AU');
    await expect(page.getByText('Scamwatch (ACCC)', { exact: true })).toBeVisible();
    await choose(page.locator('#report-country'), 'NZ');
    await expect(page.getByText('Department of Internal Affairs (spam and scams)', { exact: true })).toBeVisible();
    await choose(page.locator('#report-country'), 'CO');
    await expect(page.getByText('ColCERT', { exact: true })).toBeVisible();
    await choose(page.locator('#report-country'), 'AT');

    await page.getByRole('radio', { name: 'Illegal content or links to it' }).check();
    await page.getByRole('checkbox', { name: 'I did not consent to receiving this email.' }).check();
    await expect(page.getByText('We know no checked reporting body for this case in Austria.')).toBeVisible();
    // With no body left, the abuse contact opens by itself.
    const abuse = page.locator('details', { has: page.locator('summary', { hasText: 'Provider of the sending server' }) });
    await expect(abuse).toHaveAttribute('open', '');

    // Closing it stays closed until the country or case changes.
    await abuse.locator('summary').click();
    await page.getByRole('checkbox', { name: 'I did not consent to receiving this email.' }).uncheck();
    await page.getByRole('checkbox', { name: 'I did not consent to receiving this email.' }).check();
    await expect(abuse).toBeVisible();
    await expect(abuse).not.toHaveAttribute('open', '');

    await choose(page.locator('#report-country'), 'XX');
    await expect(page.getByText('No reporting body has been checked for other countries yet.')).toBeVisible();
    await expect(abuse).toHaveAttribute('open', '');
    await expect(page.getByRole('textbox', { name: 'Email text' })).not.toHaveValue(/I have also reported/);
  });

  test('reports to French bodies in French, also with a French page', async ({ page }) => {
    await upload(page, 'spoofed.eml', MIME, fixture('spoofed.eml'));
    await choose(page.getByRole('combobox', { name: 'Language' }), 'fr');
    await expect(page.getByRole('heading', { level: 1, name: 'Nombreux signes de spam ou de fraude' })).toBeVisible();
    await page.getByRole('button', { name: 'Signaler ce courriel' }).click();
    await choose(page.locator('#report-country'), 'FR');
    await expect(page.getByText('Les signalements aux organismes de ce pays sont en français')).toBeVisible();
    await page.getByRole('radio', { name: 'Hameçonnage ou tentative de fraude' }).check();
    await expect(page.getByText('Signal Spam', { exact: true })).toBeVisible();
    await expect(page.getByText('Phishing Initiative', { exact: true })).toBeVisible();

    await choose(page.locator('#report-country'), 'GB');
    await expect(page.getByText('Tous les signalements sont en anglais.')).toBeVisible();
  });

  test('reports a translation error with the language and page', async ({ page }) => {
    await page.goto('/help.html');
    await choose(page.getByRole('combobox', { name: 'Language' }), 'pl');
    await page.getByRole('link', { name: 'Zgłoś błąd w tłumaczeniu' }).click();
    await expect(page).toHaveURL(/imprint\.html\?topic=translation&page=help\.html#contact$/);
    await expect(page.getByText('Zgłaszasz błąd w tłumaczeniu na język polski.')).toBeVisible();
    await expect(page.locator('#contact input[name="topic"]')).toHaveValue('translation');
    await expect(page.locator('#contact input[name="lang"]')).toHaveValue('pl');
    await expect(page.locator('#contact input[name="page"]')).toHaveValue('help.html');
  });

  test('says in the report view that the page does not act for any body', async ({ page }) => {
    await upload(page, 'spoofed.eml', MIME, fixture('spoofed.eml'));
    await openReport(page);
    await expect(page.getByText('SMT Watcher is an independent project.')).toBeVisible();
  });

  test('explains how to save an email, grouped by program', async ({ page }) => {
    await page.goto('/');
    await page.locator('summary', { hasText: 'How do I get the email' }).click();
    const download = page.getByText('At the top of the email, choose More actions > Download.');
    await expect(download).toBeHidden();
    await page.locator('.guide-app summary', { hasText: /^New Outlook and Outlook on the web$/ }).click();
    await expect(download).toBeVisible();
    await expect(page.locator('.guide-app[open] dt').last()).toHaveText('headers');
  });

  test('takes the focus along when the view changes', async ({ page }) => {
    await upload(page, 'spoofed.eml', MIME, fixture('spoofed.eml'));
    await expect(page.getByRole('heading', { level: 1, name: 'Many signs of spam or fraud' })).toBeFocused();

    await openReport(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Report this email' })).toBeFocused();

    const language = page.getByRole('combobox', { name: 'Language' });
    await language.focus();
    await choose(language, 'de');
    await expect(page.getByRole('heading', { level: 1, name: 'Diese E-Mail melden' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Sprache' })).toBeFocused();

    await page.getByRole('button', { name: 'Zurück zur Einschätzung' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Viele Anzeichen für Spam oder Betrug' })).toBeFocused();
    await page.getByRole('button', { name: 'Andere E-Mail prüfen' }).click();
    await expect(page.locator('#file')).toBeFocused();
  });

  test('fits a phone screen with large enough choices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await upload(page, 'spoofed.eml', MIME, fixture('spoofed.eml'));
    await openReport(page);
    const radio = page.getByRole('radio', { name: 'Unsolicited advertising' });
    expect((await radio.boundingBox())?.height).toBeGreaterThanOrEqual(20);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await expect(page.locator('.top')).toHaveCSS('position', 'static');
  });

  test('only links to blocklists and asks them nothing by itself', async ({ page }) => {
    await upload(page, 'spoofed.eml', MIME, fixture('spoofed.eml'));
    const fold = page.locator('details', { hasText: 'Technical details' });
    await fold.locator('summary').click();
    await expect(fold.getByText('The sending server has the IP address 198.51.100.7')).toBeVisible();
    for (const [name, url] of [['Spamhaus: reputation checker', 'https://check.spamhaus.org/'], ['SpamCop: blocking list', 'https://www.spamcop.net/bl.shtml'], ['Barracuda: reputation lookup', 'https://www.barracudacentral.org/lookups']]) {
      await expect(fold.getByRole('link', { name })).toHaveAttribute('href', url);
    }
  });

  test('offers short general tips for senders in a closed section', async ({ page }) => {
    await upload(page, 'spoofed.eml', MIME, fixture('spoofed.eml'));
    const fold = page.locator('details', { hasText: 'For senders' });
    const tip = fold.getByText('Never ask for login details through a link.');
    await expect(tip).toBeHidden();
    await fold.locator('summary').click();
    await expect(tip).toBeVisible();
    await expect(fold.getByRole('listitem')).toHaveCount(6);
    await expect(fold.getByRole('link')).toHaveCount(0);
    await expect(fold.getByRole('textbox')).toHaveCount(0);
  });

  test('reads a dropped file', async ({ page }) => {
    await page.goto('/');
    const text = fixture('advertising.eml').toString('latin1');
    const drop = await page.evaluateHandle((content) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([content], 'advertising.eml', { type: 'message/rfc822' }));
      return transfer;
    }, text);
    await page.locator('#dropzone').dispatchEvent('drop', { dataTransfer: drop });
    await expect(page.getByRole('button', { name: 'Report this email' })).toBeVisible();
    await page.getByText('Technical details').click();
    await expect(page.getByText('offer@shop.example.org')).toBeVisible();
  });

  test('explains a drop that carries no file', async ({ page }) => {
    await page.goto('/');
    const drop = await page.evaluateHandle(() => new DataTransfer());
    await page.locator('#dropzone').dispatchEvent('drop', { dataTransfer: drop });
    await expect(page.locator('#error')).toContainText('did not hand over a file');
  });

  test('reads pasted headers and says that the content was not checked', async ({ page }) => {
    await page.goto('/');
    await page.getByText('No file? Paste the headers', { exact: true }).click();
    await page.locator('#pasted').fill(fixture('advertising.eml').toString('latin1').split(/\r?\n\r?\n/)[0]);
    await page.getByRole('button', { name: 'Check text' }).click();
    await expect(page.getByText('Only the headers could be read')).toBeVisible();
  });

  test('rejects other file types, text without an email and unreadable .msg files', async ({ page }) => {
    await upload(page, 'image.png', 'image/png', Buffer.from('not an email'));
    await expect(page.locator('#error')).toHaveText('Please choose a .msg, .eml or .txt file.');

    await page.locator('#file').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
    await expect(page.locator('#error')).toHaveText('This file contains no email headers.');

    await page.locator('#file').setInputFiles({ name: 'broken.msg', mimeType: 'application/vnd.ms-outlook', buffer: Buffer.from('not a msg') });
    await expect(page.locator('#error')).toHaveText('The .msg file could not be read.');
  });
});

test.describe('.msg files', () => {
  test('find the HTML inside compressed RTF', async ({ page }) => {
    await upload(page, 'mail.msg', 'application/vnd.ms-outlook', buildMsg());
    await openReport(page);
    await page.getByLabel('Unsolicited advertising').check();
    // The number is only in the RTF, so this fails if the RTF parser breaks in the browser.
    await expect(page.getByLabel(/0900 1234567/)).toBeVisible();
  });

  test('can be saved as an .eml file that the page reads again', async ({ page }) => {
    await upload(page, 'mail.msg', 'application/vnd.ms-outlook', buildMsg());
    await openReport(page);
    await page.getByLabel('Phishing or fraud attempt').check();

    const saved = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save as .eml' }).click();
    const download = await saved;
    expect(download.suggestedFilename()).toBe('email.eml');
    await expect(page.getByText('Saved as email.eml.')).toBeVisible();

    const eml = readFileSync(await download.path());
    expect(eml.toString('latin1')).toContain('X-Converted-From: msg');
    const parts = [...eml.toString('latin1').matchAll(/Content-Type: text\/html; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n([\w+/=\r\n]+)/g)];
    expect(Buffer.from(parts[0][1], 'base64').toString('utf8')).toContain('Glück');

    await page.locator('#file').setInputFiles({ name: 'email.eml', mimeType: MIME, buffer: eml });
    await openReport(page);
    await page.getByLabel('Unsolicited advertising').check();
    await expect(page.getByLabel(/0900 1234567/)).toBeVisible();
  });
});

test.describe('abuse contact', () => {
  // All answers are simulated, so these tests reach no real service.
  test.use({ expected: /request: https:\/\/rdap\.|ERR_FAILED/ });

  const openAbuseCard = async (page: Page) => {
    await upload(page, 'spoofed.eml', MIME, fixture('spoofed.eml'));
    await openReport(page);
    await page.getByLabel('Phishing or fraud attempt').check();
    await page.locator('summary', { hasText: 'Provider of the sending server' }).click();
  };

  const simulateAnswer = async (page: Page, body: unknown) => {
    const seen: string[] = [];
    await page.route('https://rdap.org/**', (route) => {
      seen.push(route.request().url());
      // No redirect here: the browser would follow it past the simulation, to the real registry.
      void route.fulfill({ json: body, headers: { 'access-control-allow-origin': '*' } });
    });
    return seen;
  };

  test('asks only after a click, and sends only the IP address', async ({ page }) => {
    const seen = await simulateAnswer(page, {
      entities: [{ roles: ['abuse'], vcardArray: ['vcard', [['email', {}, 'text', 'abuse@net.example']]] }],
    });
    await openAbuseCard(page);
    expect(seen).toEqual([]);
    await expect(page.getByText('With a click, your browser sends the IP address')).toBeVisible();

    await page.getByRole('button', { name: 'Find the abuse contact' }).click();
    await expect(page.getByText('Listed in the rdap.org record.')).toBeVisible();
    await expect(page.getByText('With a click, your browser sends the IP address')).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Abuse contact' })).toHaveValue('abuse@net.example');
    await expect(page.getByRole('link', { name: 'Write to abuse@net.example' })).toHaveAttribute('href', /^mailto:abuse%40net\.example\?subject=/);
    await expect(page.getByRole('link', { name: 'Open the full record' })).toBeVisible();
    expect(seen).toEqual(['https://rdap.org/ip/198.51.100.7']);
  });

  test('shows an address with markup only as text', async ({ page }) => {
    await simulateAnswer(page, {
      entities: [{ roles: ['abuse'], vcardArray: ['vcard', [['email', {}, 'text', '<img/src=x>@net.example']]] }],
    });
    await openAbuseCard(page);
    await page.getByRole('button', { name: 'Find the abuse contact' }).click();
    await expect(page.getByText('The record names no abuse address.')).toBeVisible();
    await expect(page.locator('.abuse-lookup img')).toHaveCount(0);
  });

  test('marks a network contact as not being an abuse address', async ({ page }) => {
    await simulateAnswer(page, {
      entities: [{ roles: ['administrative', 'technical'], vcardArray: ['vcard', [['email', {}, 'text', 'noc@net.example']]] }],
    });
    await openAbuseCard(page);
    await page.getByRole('button', { name: 'Find the abuse contact' }).click();
    await expect(page.getByText('The record names no abuse address, only this contact')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Network contact' })).toHaveValue('noc@net.example');
  });

  test('falls back to the full record if the lookup fails', async ({ page }) => {
    await page.route('https://rdap.org/**', (route) => route.abort());
    await openAbuseCard(page);
    await page.getByRole('button', { name: 'Find the abuse contact' }).click();
    await expect(page.getByText('The lookup did not work.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open the full record' })).toBeVisible();
  });

  test('keeps the result when a report is marked as sent', async ({ page }) => {
    await simulateAnswer(page, {
      entities: [{ roles: ['abuse'], vcardArray: ['vcard', [['email', {}, 'text', 'abuse@net.example']]] }],
    });
    await openAbuseCard(page);
    await page.getByRole('button', { name: 'Find the abuse contact' }).click();
    await expect(page.getByRole('textbox', { name: 'Abuse contact' })).toHaveValue('abuse@net.example');

    await page.locator('summary', { hasText: 'Verbraucherzentrale' }).click();
    await page.getByLabel('I have sent this report').check();
    await page.locator('summary', { hasText: 'Provider of the sending server' }).click();
    await expect(page.getByRole('textbox', { name: 'Abuse contact' })).toHaveValue('abuse@net.example');
  });
});

test.describe('report view', () => {
  test('copies the report text to the clipboard', async ({ page, context, baseURL }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseURL });
    await upload(page, 'spoofed.eml', MIME, fixture('spoofed.eml'));
    await openReport(page);
    await page.getByLabel('Phishing or fraud attempt').check();

    const field = page.locator('details[open] .copy-field').last();
    const expected = await field.locator('textarea').inputValue();
    expect(expected.length).toBeGreaterThan(0);
    await field.getByRole('button', { name: 'Copy' }).click();
    await expect(field.getByRole('button', { name: 'Copied' })).toBeVisible();
    // The clipboard may use the line endings of the operating system.
    expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(expected);
  });

  test('selects the text if the clipboard is refused', async ({ page }) => {
    await page.addInitScript(() => {
      navigator.clipboard.writeText = () => Promise.reject(new Error('refused'));
    });
    await upload(page, 'spoofed.eml', MIME, fixture('spoofed.eml'));
    await openReport(page);
    await page.getByLabel('Phishing or fraud attempt').check();

    const field = page.locator('details[open] .copy-field').last();
    await field.getByRole('button', { name: 'Copy' }).click();
    await expect(field.getByRole('button', { name: 'Press Ctrl+C' })).toBeVisible();
    await expect(field.locator('textarea')).toBeFocused();
  });

  test('offers the Bundesnetzagentur only after a phone number and the consent statement', async ({ page }) => {
    await upload(page, 'advertising.eml', MIME, fixture('advertising.eml'));
    await openReport(page);
    await page.getByLabel('Unsolicited advertising').check();

    const body = page.locator('summary', { hasText: 'Bundesnetzagentur' });
    await expect(body).toHaveCount(0);
    await page.getByLabel(/0900 1234567/).check();
    await expect(body).toHaveCount(0);
    await page.getByLabel('I did not consent to receiving this email.').check();
    await expect(body).toBeVisible();

    await page.getByLabel(/0900 1234567/).uncheck();
    await expect(body).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Open the complaint form' })).toHaveCount(0);
    await expect(page.getByText('requires a phone number')).toBeVisible();
  });

  test('lets the user add a number the page did not detect', async ({ page }) => {
    await page.goto('/');
    await page.getByText('No file? Paste the headers', { exact: true }).click();
    await page.locator('#pasted').fill(fixture('advertising.eml').toString('latin1').split(/\r?\n\r?\n/)[0]);
    await page.getByRole('button', { name: 'Check text' }).click();
    await openReport(page);
    await page.getByLabel('Unsolicited advertising').check();
    await page.getByLabel('I did not consent to receiving this email.').check();

    const body = page.locator('summary', { hasText: 'Bundesnetzagentur' });
    await expect(page.getByText('requires a phone number')).toBeVisible();
    await expect(body).toHaveCount(0);

    const entry = page.getByLabel('Add a number from the email');
    await entry.fill('call me');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('not a valid phone number');
    await expect(body).toHaveCount(0);

    await entry.fill('0900 1234567');
    await entry.press('Enter');
    await expect(page.getByRole('alert')).toBeHidden();
    await expect(page.getByText('is included because you chose')).toBeVisible();
    await expect(page.getByLabel('+499001234567')).toBeChecked();
    await expect(body).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Phone number' })).toHaveValue('+499001234567');
  });

  test('selects a detected number instead of adding it twice', async ({ page }) => {
    await upload(page, 'advertising.eml', MIME, fixture('advertising.eml'));
    await openReport(page);
    await page.getByLabel('Unsolicited advertising').check();
    const entry = page.getByLabel('Add a number from the email');
    await entry.fill('+49 900 1234567');
    await entry.press('Enter');
    await expect(page.getByRole('checkbox', { name: /\+499001234567/ })).toHaveCount(1);
    await expect(page.getByRole('checkbox', { name: /\+499001234567/ })).toBeChecked();
  });

  test('guides through one report per number', async ({ page }) => {
    await upload(page, 'advertising.eml', MIME, fixture('advertising.eml'));
    await openReport(page);
    await page.getByLabel('Unsolicited advertising').check();
    await page.getByLabel('I did not consent to receiving this email.').check();
    await page.getByLabel(/0900 1234567/).check();
    const entry = page.getByLabel('Add a number from the email');
    await entry.fill('0800 7654321');
    await entry.press('Enter');

    await expect(page.getByText('send 2 reports')).toBeVisible();
    const first = page.locator('details.step', { hasText: 'Report 1 of 2' });
    const second = page.locator('details.step', { hasText: 'Report 2 of 2' });
    await expect(first).toHaveAttribute('open');
    await expect(first.getByRole('textbox', { name: 'Phone number' })).toHaveValue('+499001234567');
    const notes = await first.getByRole('textbox', { name: 'Additional notes' }).inputValue();
    expect(notes).toContain('+499001234567');
    expect(notes).not.toContain('+498007654321');

    await first.getByLabel('I have sent this report').check();
    await expect(second).toHaveAttribute('open');
    await expect(first).not.toHaveAttribute('open');
    await expect(first.locator('summary')).toContainText('✓');
    await expect(second.getByRole('textbox', { name: 'Phone number' })).toHaveValue('+498007654321');

    // A report counts for the provider's text as soon as one number has been sent.
    await page.locator('summary', { hasText: 'Provider of the sending server' }).click();
    await expect(page.getByRole('textbox', { name: 'Email text' })).toHaveValue(/Bundesnetzagentur/);
  });

  test('keeps the email through back, forward and a language change', async ({ page }) => {
    await upload(page, 'spoofed.eml', MIME, fixture('spoofed.eml'));
    await openReport(page);
    await expect(page).toHaveURL(/#report$/);

    await choose(page.getByRole('combobox', { name: 'Language' }), 'de');
    await expect(page.getByRole('heading', { name: 'Diese E-Mail melden' })).toBeVisible();

    await page.goBack();
    await expect(page.getByText('Viele Anzeichen', { exact: false })).toBeVisible();
    await page.goForward();
    await expect(page.getByRole('heading', { name: 'Diese E-Mail melden' })).toBeVisible();
  });

  test('keeps the entries through a language change, but not for a new email', async ({ page }) => {
    await upload(page, 'spoofed.eml', MIME, fixture('spoofed.eml'));
    await openReport(page);
    await page.getByRole('radio', { name: 'Unsolicited advertising' }).check();
    await page.getByRole('checkbox', { name: 'I did not consent to receiving this email.' }).check();
    const phone = page.locator('.phone-entry input');
    await phone.fill('0151 12345678');
    await phone.press('Enter');
    await phone.fill('0171');

    await choose(page.getByRole('combobox', { name: 'Language' }), 'de');
    await expect(page.getByRole('radio', { name: 'Unerwünschte Werbung' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Ich habe dem Erhalt dieser E-Mail nicht zugestimmt.' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: /12345678/ })).toBeChecked();
    await expect(page.locator('.phone-entry input')).toHaveValue('0171');
    await expect(page.locator('details.recipient').first()).toBeVisible();

    await upload(page, 'spoofed.eml', MIME, fixture('spoofed.eml'));
    await page.getByRole('button', { name: 'Diese E-Mail melden' }).click();
    await expect(page.getByRole('radio', { name: 'Unerwünschte Werbung' })).not.toBeChecked();
  });
});

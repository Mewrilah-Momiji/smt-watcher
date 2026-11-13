import { describe, expect, it } from 'vitest';
import { assess } from '../src/core/assessment';
import { extractLinks, findContentIssues, type MailContent, type MailContext } from '../src/core/content';
import { forReader, type Finding, type FindingCode } from '../src/core/findings';
import { buildReport } from '../src/core/headers';

const empty: MailContent = { subject: null, bodyText: null, bodyHtml: null, attachmentNames: [] };

function codes(content: Partial<MailContent>, name = '', domain: string | null = 'shop.example', context: Partial<MailContext> = {}): string[] {
  return findContentIssues(
    { ...empty, ...content },
    { fromName: name, fromDomain: domain, fromAddress: null, hasReplyHeaders: false, recipientAddresses: [], ...context },
  ).map((finding) => finding.code);
}

function finding(code: FindingCode): Finding {
  return { code, severity: 'note' };
}

describe('extractLinks', () => {
  it('reads href as a browser does', () => {
    const hosts = (html: string) => extractLinks(html, null).map((link) => link.host);
    expect(hosts('<a href=https://a.example/>x</a>')).toEqual(['a.example']);
    expect(hosts('<a data-href="https://shown.example/" href="https://a.example/">x</a>')).toEqual(['a.example']);
    expect(hosts('<a title="1 > 0" href="https://a.example/">x</a>')).toEqual(['a.example']);
    expect(hosts('<a href="javascript:void(0)">x</a>')).toEqual([]);
  });

  it('reads anchors and plain URLs', () => {
    expect(
      extractLinks('<a class="x" href="https://A.example/p?a=1&amp;b=2"><b>Text</b></a><a href="mailto:x@y.example">m</a>', 'See https://b.example/x.'),
    ).toEqual([
      { host: 'a.example', visibleText: 'Text' },
      { host: 'b.example', visibleText: null },
    ]);
  });

  it('survives broken URLs', () => {
    expect(extractLinks('<a href="https://">x</a>', 'http://[bad')).toEqual([]);
  });
});

describe('findContentIssues', () => {
  it('reports a link that shows another domain', () => {
    expect(codes({ bodyHtml: '<a href="https://evil.example/x">www.mybank.example</a>' })).toEqual(['link-text-mismatch']);
    const signed = findContentIssues({ subject: null, bodyText: null, bodyHtml: '<a href="https://evil.example/x">www.mybank.example</a>', attachmentNames: [] }, { fromName: '', fromDomain: null, fromAddress: null, hasReplyHeaders: false, recipientAddresses: [], signedBySender: true });
    expect(signed.map((entry) => entry.code)).toEqual(['link-text-signed-sender']);
  });

  it('accepts a link to the shown domain or its subdomain', () => {
    expect(codes({ bodyHtml: '<a href="https://news.mybank.example/x">https://www.mybank.example/</a>' })).toEqual([]);
  });

  it('ignores ordinary link text', () => {
    expect(codes({ bodyHtml: '<a href="https://evil.example/x">Hier klicken</a>' })).toEqual([]);
  });

  it('reports IP, disguised and shortened links', () => {
    expect(codes({ bodyText: 'http://192.0.2.7/login' })).toEqual(['link-ip-host']);
    expect(codes({ bodyText: 'https://xn--pypal-4ve.example/' })).toEqual(['link-punycode']);
    expect(codes({ bodyText: 'https://bit.ly/abc' })).toEqual(['link-shortener']);
  });

  it('does not count links to the own computer or private networks as IP links', () => {
    expect(codes({ bodyText: 'http://127.0.0.1:8080/manager http://192.168.1.10/ http://10.0.0.5/ http://172.20.0.1/' })).toEqual([]);
    expect(codes({ bodyText: 'http://172.32.0.1/login' })).toEqual(['link-ip-host']);
  });

  it('reports a brand name from a foreign domain only', () => {
    expect(codes({}, 'PayPal Service', 'mailer.example')).toEqual(['brand-impersonation']);
    expect(codes({}, 'PayPal Service', 'mail.paypal.de')).toEqual([]);
    expect(codes({}, 'Sparkasse Musterstadt', 'sparkasse-musterstadt.de')).toEqual([]);
    expect(codes({}, 'Apple Support', 'icloud.com')).toEqual([]);
  });

  it('does not accept a longer domain that only contains the brand, unless the brand has many own domains', () => {
    expect(codes({}, 'HELLWEG Baumarkt', 'hellweg-angebote.example')).toEqual(['brand-impersonation']);
    expect(codes({}, 'PayPal Service', 'paypal-secure.example')).toEqual(['brand-impersonation']);
    expect(codes({}, 'HELLWEG Baumarkt', 'hellweg.de')).toEqual([]);
    expect(codes({}, 'Volksbank Musterland', 'volksbank-musterland.de')).toEqual([]);
  });

  it('knows brands seen in phishing, also when sent from free mail', () => {
    expect(codes({}, 'SumUp', 'kursportal.example')).toEqual(['brand-impersonation']);
    expect(codes({}, 'Stripe Compliance', 'gmail.com')).toEqual(['brand-impersonation']);
    expect(codes({}, 'Stripe', 'stripe.com')).toEqual([]);
    expect(codes({}, 'UPS Kundenservice', 'classa.example')).toEqual(['brand-impersonation']);
    expect(codes({}, 'UPS', 'ups.com')).toEqual([]);
    expect(codes({}, 'Obi-Umfrageprämie verfügbar', 'stillen-und-tragen.example')).toEqual(['brand-impersonation']);
    expect(codes({}, 'OBI Markt', 'obi.de')).toEqual([]);
  });

  it('accepts a carrier named through a shop only if the shop signed and links lead to the carrier', () => {
    const signed = { signedBySender: true };
    const link = { bodyText: 'https://custcomm.dhl.de/a' };
    expect(codes(link, 'DHL Paket über Shop', 'mail.shop.example', signed)).toEqual([]);
    expect(codes(link, 'DHL Paket über Shop', 'mail.shop.example')).toEqual(['brand-impersonation']);
    expect(codes({ bodyText: 'https://other.example/a' }, 'DHL Paket über Shop', 'mail.shop.example', signed)).toEqual(['brand-impersonation']);
    expect(codes(link, 'DHL Paket', 'mail.shop.example', signed)).toEqual(['brand-impersonation']);
  });

  it('does not count a windfall with the notice licensed lotteries print', () => {
    const offer = 'Lotterie: 120.000 Euro zu gewinnen.';
    expect(codes({ bodyText: offer })).toEqual(['windfall-promise']);
    expect(codes({ bodyText: `${offer} Glücksspiel kann süchtig machen.` })).toEqual([]);
  });

  it('accepts HTML attachments from a signed sender, but never programs', () => {
    const signed = { signedBySender: true };
    expect(codes({ attachmentNames: ['terms.html'] })).toEqual(['risky-attachment']);
    expect(codes({ attachmentNames: ['terms.html'] }, '', 'shop.example', signed)).toEqual([]);
    expect(codes({ attachmentNames: ['setup.exe'] }, '', 'shop.example', signed)).toEqual(['risky-attachment']);
  });

  it('accepts padding characters in the text only from a signed brand domain, but never in the name', () => {
    const padded = { bodyText: 'G‌m b‌H H‌R B‌1' };
    expect(codes(padded, '', 'mailer.example', { signedBySender: true })).toEqual(['hidden-characters']);
    expect(codes(padded, '', 'ebay.com', { signedBySender: true })).toEqual([]);
    expect(codes(padded, '', 'ebay.com')).toEqual(['hidden-characters']);
    expect(codes({}, 'P​a​y', 'ebay.com', { signedBySender: true })).toEqual(['hidden-characters']);
  });

  it('allows soft hyphens in a subject, but not in a name', () => {
    expect(codes({ subject: 'Deut­sche Rente' })).toEqual([]);
    expect(codes({}, 'Con­sors')).toEqual(['hidden-characters']);
  });

  it('counts a request for login details, not a mention of them', () => {
    const link = 'https://a.example/';
    expect(codes({ bodyText: `Geben Sie Ihre Zugangsdaten niemals weiter. ${link}` })).toEqual([]);
    expect(codes({ bodyText: `Bitte Zugangsdaten bestätigen: ${link}` })).toEqual(['credential-request']);
    expect(codes({ bodyText: `Bitte überprüfen Sie Ihre Anmeldedaten: ${link}` })).toEqual(['credential-request']);
    expect(codes({ bodyText: `Bitte bestätigen Sie Ihre Daten bis zum 8. November. ${link}` })).toEqual(['credential-request']);
    expect(codes({ bodyText: `Daten jetzt bestätigen ${link}` })).toEqual(['credential-request']);
    // A request to check data that were sent along, as legitimate emails make it, does not count.
    expect(codes({ bodyText: `Wir bitten Sie, Ihre Daten zu überprüfen. ${link}` })).toEqual([]);
  });

  it('counts a fake storage alert with a link', () => {
    const link = 'https://a.example/';
    expect(codes({ bodyText: `Cloud Services Disabled. Your storage limit has been reached. ${link}` })).toEqual(['credential-request']);
    expect(codes({ bodyText: `Please upgrade your storage plan today. ${link}` })).toEqual(['credential-request']);
    expect(codes({ bodyText: `Ihr Speicherplatz ist voll. ${link}` })).toEqual(['credential-request']);
    expect(codes({ bodyText: `ストレージプランの更新失敗によるデータ消失のご注意 ${link}` })).toEqual(['foreign-script', 'credential-request']);
    // Without a link it is only a statement.
    expect(codes({ bodyText: 'Your storage limit has been reached.' })).toEqual([]);
  });

  it('accepts a link to the same name on another ending, but not another name', () => {
    expect(codes({ bodyHtml: '<a href="https://www.dpd.com/x">dpd.de</a>' })).toEqual([]);
    expect(codes({ bodyHtml: '<a href="https://www.dpd-post.com/x">dpd.de</a>' })).toEqual(['link-text-mismatch']);
  });

  it('accepts a shop name and numbered address only from a platform that signed', () => {
    const shop = { fromAddress: 'store+1234567890@t.shopifyemail.com' };
    expect(codes({}, 'musterhome.de', 't.shopifyemail.com', { ...shop, signedBySender: true })).toEqual([]);
    expect(codes({}, 'musterhome.de', 't.shopifyemail.com', shop)).toEqual(['bulk-sender-address', 'display-name-domain']);
    expect(codes({}, 'musterhome.de', 'mailer.example', { ...shop, signedBySender: true })).toEqual(['bulk-sender-address', 'display-name-domain']);
  });

  it('ends an address at a typographic quote', () => {
    expect(extractLinks(null, 'Links beginnen mit „https://www.amazon.de“.')).toEqual([{ host: 'www.amazon.de', visibleText: null }]);
    expect(codes({ bodyText: 'Links beginnen mit „https://www.amazon.de“.' })).toEqual([]);
  });

  it('reports disguised letters from five on', () => {
    expect(codes({ bodyText: 'Was über 𝕁𝕒𝕦𝕔𝕙 bekannt ist' })).toEqual(['styled-letters']);
    expect(codes({ bodyText: 'Die Formel 𝑥 + 𝑦' })).toEqual([]);
  });

  it('reports a garbled sender name, but not umlauts', () => {
    expect(codes({}, 'BestÃ¤tigungs E-Mail')).toEqual(['garbled-sender-name']);
    expect(codes({}, 'Bestätigungs E-Mail')).toEqual([]);
  });

  it('knows public file hosts without a region', () => {
    expect(codes({ bodyText: 'https://abc.s3.amazonaws.com/x' })).toEqual(['link-public-host']);
    expect(codes({ bodyText: 'https://abc.s3.eu-west-1.amazonaws.com/x' })).toEqual(['link-public-host']);
  });

  it('reports an unfilled placeholder in the name or subject only', () => {
    expect(codes({}, '[first_name]')).toEqual(['unfilled-placeholder']);
    expect(codes({ subject: 'Hallo {{firstname}}' })).toEqual(['unfilled-placeholder']);
    expect(codes({ bodyText: 'Hallo [name]' })).toEqual([]);
    expect(codes({}, 'Name GmbH')).toEqual([]);
  });

  it('counts a request to change payment or account details', () => {
    const link = 'https://a.example/';
    expect(codes({ bodyText: `Please update your information: ${link}` })).toEqual(['credential-request']);
    expect(codes({ bodyText: `Bitte überprüfen Sie Ihre Kontodaten: ${link}` })).toEqual(['credential-request']);
    expect(codes({ bodyText: `Ihre Kontodaten sind bei uns sicher. ${link}` })).toEqual([]);
  });

  it('puts a numbered bulk address at the top level, without a fraud warning', () => {
    const assessment = assess(findContentIssues(empty, { fromName: '', fromDomain: 'shop.example', fromAddress: 'perfekt1790166875@shop.example', hasReplyHeaders: false, recipientAddresses: [] }));
    expect(assessment.level).toBe('many-signs');
    expect(assessment.phishingSigns).toBe(false);
  });

  it('does not take a numbered title for a domain', () => {
    expect(extractLinks('<a href="https://www.ebay.de/x">2.Set Memory</a>', null)).toEqual([{ host: 'www.ebay.de', visibleText: '2.Set Memory' }]);
    expect(codes({ bodyHtml: '<a href="https://www.ebay.de/x">2.Set Memory</a>' })).toEqual([]);
    expect(codes({ bodyHtml: '<a href="https://evil.example/x">bank.example</a>' })).toEqual(['link-text-mismatch']);
  });

  it('does not match a brand inside another word', () => {
    expect(codes({}, 'Pineapple Shop', 'pineapple.example')).toEqual([]);
    expect(codes({}, 'Applewood', 'shop.example')).toEqual([]);
  });

  it('reports account wording only together with a link', () => {
    expect(codes({ bodyText: 'Ihr Konto wird gesperrt.' })).toEqual([]);
    expect(codes({ bodyText: 'Ihr Konto wird gesperrt: https://a.example/' })).toEqual(['credential-request']);
  });

  it('reports risky attachments regardless of case', () => {
    expect(codes({ attachmentNames: ['Rechnung.PDF'] })).toEqual([]);
    expect(codes({ attachmentNames: ['Rechnung.pdf.EXE'] })).toEqual(['risky-attachment']);
    expect(codes({ attachmentNames: ['login.html'] })).toEqual(['risky-attachment']);
  });
});

describe('patterns found in real spam', () => {
  it('reports invisible characters inside words but not newsletter padding', () => {
    expect(codes({ subject: 'Hinw‏weis: Verifizi‏erung' })).toEqual(['hidden-characters']);
    expect(codes({}, 'Mus­ter­shop')).toEqual(['hidden-characters']);
    expect(codes({ bodyText: 'Ne​ue Na​chricht vo​n uns' })).toEqual(['hidden-characters']);
    expect(codes({ bodyText: `${'Ein langer gewöhnlicher Absatz ohne Besonderheiten. '.repeat(20)}a‌b c‌d e‌f` })).toEqual([]);
    expect(codes({ subject: 'Hallo‪ Welt‬' })).toEqual([]);
    expect(codes({ bodyText: 'Angebot ‌ ‌ ‌ ‌ Hallo' })).toEqual([]);
    expect(codes({ bodyText: 'Auto­matische Tren­nung im Text von Web­seiten' })).toEqual([]);
  });

  it('reports reversed text direction in the sender name', () => {
    expect(codes({}, '‮nozamA‬')).toEqual(['hidden-characters']);
  });

  it('sees brands through invisible characters and in Japanese', () => {
    expect(codes({}, 'Con­sorsb­ank AG', 'hotmail.com')).toContain('brand-impersonation');
    expect(codes({}, '楽天ペイ アカウント管理チーム', 'spielportal.example')).toEqual(['brand-impersonation']);
    expect(codes({}, 'LiDL', 'muster-schuhe.shop')).toEqual(['risky-tld', 'brand-impersonation']);
    expect(codes({}, 'iCloud', 'icloud.com')).toEqual([]);
  });

  it('reports a domain in the display name that differs from the sender', () => {
    expect(codes({}, 'Geschäftsstelle | muster-treuhand.de', 'treuhand-muster.example')).toEqual(['display-name-domain']);
    expect(codes({}, 'musterladen.de | Rabatt', 'musterladen.de')).toEqual([]);
  });

  it('reports a reply without a conversation', () => {
    expect(codes({ subject: 'AW: Rabatt' })).toEqual(['fake-reply']);
    expect(codes({ subject: 'AW: Rabatt' }, '', 'shop.example', { hasReplyHeaders: true })).toEqual([]);
    expect(codes({ subject: 'Awesome: Rabatt' })).toEqual([]);
  });

  it('reports the recipient address in the subject', () => {
    expect(codes({ subject: 'Angebot – Me@Example.org' }, '', 'shop.example', { recipientAddresses: ['me@example.org'] })).toEqual(['address-in-subject']);
  });

  it('reports a greeting with the recipient address instead of a name', () => {
    const me = { recipientAddresses: ['me@example.org'] };
    expect(codes({ bodyText: 'Dear me@example.org, your mailbox is full.' }, '', 'shop.example', me)).toEqual(['address-greeting']);
    expect(codes({ bodyText: 'Hallo me@example.org,\nbitte bestätigen.' }, '', 'shop.example', me)).toEqual(['address-greeting']);
    expect(codes({ bodyText: 'Hallo Max, deine Adresse me@example.org ist hinterlegt.' }, '', 'shop.example', me)).toEqual([]);
    expect(codes({ bodyText: 'Dear me@example.org' })).toEqual([]);
  });

  it('reports the recipient domain name in the name of a sender from another domain', () => {
    const me = { recipientAddresses: ['jo@monkey.example'] };
    expect(codes({}, 'Monkey IT Helpdesk', 'other.example', me)).toEqual(['recipient-org-in-name', 'role-name-external']);
    expect(codes({}, 'HR Department-Monkey', 'other.example', me)).toEqual(['recipient-org-in-name', 'role-name-external']);
    expect(codes({}, 'Monkey IT Helpdesk', 'monkey.example', me)).toEqual([]);
    expect(codes({}, 'Monkeybusiness Shop', 'other.example', me)).toEqual([]);
    // Names shorter than four letters are common words, and a provider may write from its main domain.
    expect(codes({}, 'GMX Team', 'other.example', { recipientAddresses: ['jo@gmx.example'] })).toEqual([]);
    expect(codes({}, 'T-Online Kundenservice', 'telekom.de', { recipientAddresses: ['erika.mustermann.test@t-online.de'] })).toEqual([]);
  });

  it('reports links to free hosting found in phishing, including IPFS gateways', () => {
    expect(codes({ bodyText: 'https://login-check.vercel.app/x' })).toEqual(['link-public-host']);
    expect(codes({ bodyText: 'https://ipfs.io/ipfs/bafy123/index.html' })).toEqual(['link-public-host']);
    expect(codes({ bodyText: 'https://abc.flk-ipfs.xyz/page' })).toEqual(['link-public-host', 'risky-tld']);
    expect(codes({ bodyText: 'https://zipfsoft.example/page' })).toEqual([]);
  });

  it('reports words that mix Latin with Cyrillic or Greek look-alikes', () => {
    // "MetaMask" with Cyrillic е and а, "part" and "secure" with Cyrillic а and е.
    expect(codes({}, 'MеtаMask Team', 'wellness.example')).toContain('mixed-script-words');
    expect(codes({ bodyText: 'As pаrt of our sеcure process, confirm now.' })).toEqual(['mixed-script-words']);
    expect(codes({ bodyText: 'Only one pаrt is odd here.' })).toEqual([]);
    expect(codes({ bodyText: 'Привет, это обычный текст. Hello, plain text.' })).not.toContain('mixed-script-words');
  });

  it('reports cheap top-level domains of the sender or a link as a weak sign', () => {
    expect(codes({}, 'Shop', 'deals.bond')).toEqual(['risky-tld']);
    expect(codes({ bodyText: 'https://login.example.vip/x' })).toEqual(['risky-tld']);
    expect(codes({ bodyText: 'https://www.example.de/x' })).toEqual([]);
  });

  it('reports a role name from a domain other than the recipient\'s, unless a brand signs', () => {
    const me = { recipientAddresses: ['jo@firma.example'] };
    expect(codes({}, 'IT Helpdesk', 'other.example', me)).toEqual(['role-name-external']);
    expect(codes({}, 'Webmail Administrator', 'other.example', me)).toEqual(['role-name-external']);
    expect(codes({}, 'IT Helpdesk', 'firma.example', me)).toEqual([]);
    expect(codes({}, 'Microsoft account team', 'accountprotection.microsoft.com', { ...me, signedBySender: true })).toEqual([]);
    expect(codes({}, 'Systemhaus Müller', 'other.example', me)).toEqual([]);
  });

  it('reports crypto wallets and Firebase hosting imitated in phishing', () => {
    expect(codes({}, 'Trezor Support', 'altos.example')).toEqual(['brand-impersonation']);
    expect(codes({}, 'MetaMask', 'consensys.io')).toEqual([]);
    expect(codes({ bodyText: 'https://wallet-sync.firebaseapp.com/x' })).toEqual(['link-public-host']);
  });

  it('reports English brands imitated in phishing', () => {
    expect(codes({}, 'DocuSign via Monkey', 'meltasventures.example')).toEqual(['brand-impersonation']);
    expect(codes({}, 'Geek Squad Billing', 'shop.example')).toEqual(['brand-impersonation']);
    expect(codes({}, 'Geek Squad', 'bestbuy.com')).toEqual([]);
    expect(codes({}, 'DocuSign', 'docusign.net')).toEqual([]);
  });

  it('reports generated sender addresses', () => {
    expect(codes({}, '', 'shop.example', { fromAddress: 'perfekt1791193663@shop.example' })).toEqual(['bulk-sender-address']);
    expect(codes({}, '', 'shop.example', { fromAddress: 'null@shop.example' })).toEqual(['bulk-sender-address']);
    expect(codes({}, '', 'shop.example', { fromAddress: 'info2024@shop.example' })).toEqual([]);
  });

  it('reports a sender domain of six or more letters without a vowel', () => {
    expect(codes({}, 'Ratgeber', 'qthshtjc.com')).toEqual(['random-sender-domain']);
    expect(codes({}, 'Ratgeber', 'news.qthshtjc.com')).toEqual(['random-sender-domain']);
    expect(codes({}, 'Ratgeber', 'rhythm.example')).toEqual([]);
    expect(codes({}, 'Ratgeber', 'bmw.de')).toEqual([]);
    expect(codes({}, 'Ratgeber', 'xyz123.example')).toEqual([]);
  });

  it('reports public hosting and shortener subdomains', () => {
    expect(codes({ bodyText: 'https://abc.storage.googleapis.com/x' })).toEqual(['link-public-host']);
    expect(codes({ bodyText: 'https://bucket.s3.eu-central-1.amazonaws.com/x' })).toEqual(['link-public-host']);
    expect(codes({ bodyText: 'https://s3-eu-west-1.amazonaws.com/img.png' })).toEqual([]);
    expect(codes({ bodyText: 'https://search.app.goo.gl/x' })).toEqual(['link-shortener']);
    expect(findContentIssues({ subject: null, bodyText: 'https://bit.ly/abc', bodyHtml: null, attachmentNames: [] }, { fromName: '', fromDomain: null, fromAddress: null, hasReplyHeaders: false, recipientAddresses: [] })[0].severity).toBe('warning');
  });

  it('reports text mostly in another script', () => {
    expect(codes({ bodyText: 'お支払い情報の確認が取れません Apple' })).toEqual(['foreign-script']);
    expect(codes({ bodyText: 'Ein deutscher Text mit einem Wort: 東京' })).toEqual([]);
  });

  it('does not count Cyrillic as foreign for Bulgarian readers', () => {
    const findings = (bodyText: string) => findContentIssues({ subject: null, bodyText, bodyHtml: null, attachmentNames: [] }, { fromName: '', fromDomain: null, fromAddress: null, hasReplyHeaders: false, recipientAddresses: [] });
    const bulgarian = findings('Здравейте, изпращаме ви фактурата за месец октомври.');
    expect(bulgarian.map((finding) => finding.params)).toEqual([{ script: 'cyrillic' }]);
    expect(forReader(bulgarian, 'bg')).toEqual([]);
    expect(forReader(bulgarian, 'de')).toEqual(bulgarian);
    const japanese = findings('お支払い情報の確認が取れません');
    expect(forReader(japanese, 'bg')).toEqual(japanese);
  });

  it('reports promised money only with a large amount', () => {
    expect(codes({ bodyText: 'Sie sind Begünstigter einer Spende in Höhe von 1.200.000,00 €' })).toEqual(['windfall-promise']);
    expect(codes({ bodyText: 'Sie wurden als Empfänger einer Spende in Höhe von 500.000 US-Dollar ausgewählt.' })).toEqual(['windfall-promise']);
    expect(codes({ bodyText: 'You are the beneficiary of an inheritance of 2,500,000 $' })).toEqual(['windfall-promise']);
    expect(codes({ bodyText: 'Der Nachlass beträgt 10 %.' })).toEqual([]);
  });

  it('reports a gift that only needs the shipping paid', () => {
    expect(codes({ bodyText: 'Eine Person hat Ihnen ein Produkt als Geschenk bestellt. Bitte zahlen Sie die Versandkosten.' })).toEqual(['gift-shipping-fee']);
    expect(codes({ bodyText: 'Ein Geschenk für Sie: versandkostenfrei ab 50 €.' })).toEqual([]);
    expect(codes({ bodyText: 'Jemand hat Ihnen ein Produkt als Geschenk bestellt.' })).toEqual([]);
    expect(codes({ bodyText: 'A friend has sent you a gift. Please pay the shipping fee to receive it.' })).toEqual(['gift-shipping-fee']);
    expect(codes({ bodyText: 'Someone ordered this for you as a gift. Pay the delivery fee to release the parcel.' })).toEqual(['gift-shipping-fee']);
    expect(codes({ bodyText: 'The perfect gift for you: shipping costs are free over 50 $.' })).toEqual([]);
    expect(codes({ bodyText: 'Gift cards ship free. No shipping costs.' })).toEqual([]);
    expect(assess([finding('gift-shipping-fee')])).toMatchObject({ level: 'many-signs', phishingSigns: true });
  });

  it('reports text pushed far below the message', () => {
    expect(codes({ bodyHtml: '<p>Hallo</p><div style="padding-top:2000px;">Filler</div>' })).toEqual(['hidden-filler-text']);
    expect(codes({ bodyHtml: '<div style="padding-top: 20px;">Hallo</div>' })).toEqual([]);
  });

  it('reports insolvency offers', () => {
    expect(codes({ bodyText: 'Waren aus laufenden Insolvenzverfahren' })).toEqual(['liquidation-offer']);
    expect(codes({ bodyText: 'Die Insolvenz ist ein Thema der Zeitung.' })).toEqual([]);
  });

  it('reports offers to recover lost crypto money', () => {
    expect(codes({ bodyText: 'Wir helfen bei der Rückgewinnung verlorener Krypto-Investitionen.' })).toEqual(['crypto-recovery']);
    expect(codes({ bodyText: 'We specialise in the recovery of stolen crypto assets.' })).toEqual(['crypto-recovery']);
    expect(codes({ bodyText: 'Ihr Krypto-Depot ist eröffnet.' })).toEqual([]);
  });

  it('reports extortion with threats and a Bitcoin demand', () => {
    const demand = 'Transfer $1250 to my Bitcoin wallet.';
    expect(codes({ bodyText: `I recorded you through your webcam. ${demand} You have 48 hours.` })).toEqual(['extortion-threat']);
    expect(codes({ bodyText: `Ich habe dich über deine Kamera aufgenommen und schicke es deine Familie. Zahle in Bitcoin an diese Adresse.` })).toEqual(['extortion-threat']);
    // One threat is not enough, and Bitcoin alone is news, not extortion.
    expect(codes({ bodyText: `Your webcam is on sale. ${demand}` })).toEqual([]);
    expect(codes({ bodyText: 'Der Bitcoin-Kurs steigt, die Wallet-Adresse steht im Konto.' })).toEqual([]);
  });

  it('notes ads posing as a report and passwords in plain text', () => {
    expect(codes({ subject: 'Sonderbericht: Das neue Ritual' })).toEqual(['advertorial']);
    expect(codes({ bodyText: 'Ihr Passwort: Xy7!abcd' })).toEqual(['plain-password']);
    expect(codes({ bodyText: 'Ihr Passwort: bitte nie weitergeben' })).toEqual([]);
  });

  it('counts an insolvency offer at full strength', () => {
    expect(assess([finding('liquidation-offer')]).level).toBe('many-signs');
  });
});

describe('assess', () => {
  it('gives no all-clear level from uncounted signals', () => {
    const result = assess([finding('no-check-results'), finding('return-path-other-domain'), finding('message-id-missing')]);
    expect(result.level).toBe('no-signs');
    expect(result.reasons).toEqual([]);
  });

  it('keeps weak signals at some signs', () => {
    expect(assess([finding('reply-to-other-domain')]).level).toBe('some-signs');
    expect(assess([finding('reply-to-signed-sender')]).level).toBe('no-signs');
    expect(assess([finding('link-text-signed-sender')]).level).toBe('no-signs');
    expect(assess([finding('dkim-failed')]).level).toBe('some-signs');
  });

  it('reaches many signs by one strong or several weaker signals', () => {
    expect(assess([finding('spf-failed')]).level).toBe('many-signs');
    expect(assess([finding('dkim-failed'), finding('reply-to-other-domain')]).level).toBe('many-signs');
  });

  it('flags fraud signs separately', () => {
    expect(assess([finding('brand-impersonation')]).phishingSigns).toBe(true);
    expect(assess([finding('spf-failed')]).phishingSigns).toBe(false);
  });
});

describe('buildReport', () => {
  it('merges content findings with warnings first', () => {
    const report = buildReport('Received: from a by b; Sun, 01 Nov 2026 10:00:02 +0100\nFrom: Amazon <x@mailer.example>\nTo: a@a.example\nSubject: Order\nMessage-ID: <1@mailer.example>', {
      bodyHtml: '<a href="https://evil.example/">www.shop.example</a>',
    });
    expect(report.hasHtml).toBe(true);
    expect(report.findings.map((entry) => entry.code)).toEqual(['brand-impersonation', 'no-check-results', 'link-text-mismatch']);
  });
});

describe('compensation payouts and replies to free mail', () => {
  it('counts a compensation payout with a large amount as a windfall', () => {
    expect(codes({ bodyText: 'Sie haben die für Sie vorgesehene Entschädigungssumme in Höhe von 20 Millionen Euro nicht erhalten.' })).toEqual(['windfall-promise']);
    expect(codes({ bodyText: 'Your compensation payment of 1,500,000 USD is ready.' })).toEqual(['windfall-promise']);
    expect(codes({ bodyText: 'Ihre Entschädigungszahlung für den verspäteten Flug.' })).toEqual([]);
  });

  it('flags a request to answer at a free mail address of someone else', () => {
    const body = 'Bitte übermitteln Sie die folgenden Angaben ausschließlich an diese E-Mail-Adresse: (agent.example@gmail.com)';
    expect(codes({ bodyText: body }, '', 'hijacked.example')).toEqual(['reply-freemail-in-body']);
    expect(codes({ bodyText: 'Please reply to me at agent.example@outlook.com only.' }, '', 'hijacked.example')).toEqual(['reply-freemail-in-body']);
  });

  it('leaves free mail addresses alone without a request, from the same provider or on a list', () => {
    expect(codes({ bodyText: 'Gesendet von max.example@gmail.com am Montag.' }, '', 'shop.example')).toEqual([]);
    expect(codes({ bodyText: 'Please reply to me at me.example@gmail.com.' }, '', 'gmail.com')).toEqual([]);
    expect(codes({ bodyText: 'Antworten Sie an info@shop.example.' }, '', 'other.example')).toEqual([]);
    expect(codes({ bodyText: 'Contact me at dev.example@gmail.com for the patch.' }, '', 'apache.example', { isList: true })).toEqual([]);
  });
});

describe('local part of the address as a name and SAISON', () => {
  const me = { recipientAddresses: ['trinklein@mine.example'] };

  it('flags the lower-case local part used as a name', () => {
    expect(codes({ bodyText: 'Guten Abend trinklein, es macht einen krank.' }, '', 'shop.example', me)).toEqual(['local-part-as-name']);
    expect(codes({ subject: 'trinklein Pillen Pharma', bodyText: 'Hallo' }, '', 'shop.example', me)).toEqual(['local-part-as-name']);
    expect(codes({ bodyText: 'zodrik 様\nご利用ありがとうございます。' }, '', 'shop.example', { recipientAddresses: ['zodrik@mine.example'] })).toContain('local-part-as-name');
  });

  it('leaves a real name, a short local part and lists alone', () => {
    expect(codes({ bodyText: 'Guten Abend Herr Trinklein, Ihre Bestellung.' }, '', 'shop.example', me)).toEqual([]);
    expect(codes({ bodyText: 'Hallo max, neue Nachricht.' }, '', 'shop.example', { recipientAddresses: ['max@mine.example'] })).toEqual([]);
    expect(codes({ bodyText: 'Hello trinklein, the build failed.' }, '', 'shop.example', { ...me, isList: true })).toEqual([]);
  });

  it('knows the SAISON card', () => {
    expect(codes({ bodyText: 'Hallo' }, 'SAISON ID', 'vpgs.example')).toContain('brand-impersonation');
    expect(codes({ bodyText: 'Hallo' }, 'セゾンカード', 'vpgs.example')).toContain('brand-impersonation');
    expect(codes({ bodyText: 'Hallo' }, 'SAISON CARD', 'saisoncard.co.jp')).not.toContain('brand-impersonation');
  });

  it('knows OpenAI and brand names written with lookalike letters', () => {
    expect(codes({ bodyText: 'Hallo' }, 'OpenAl', 'freeway.example')).toContain('brand-impersonation');
    expect(codes({ bodyText: 'Hallo' }, 'ChatGPT Billing', 'freeway.example')).toContain('brand-impersonation');
    expect(codes({ bodyText: 'Hallo' }, 'SPECIAL_LlDL', 'shop.example')).toContain('brand-impersonation');
    expect(codes({ bodyText: 'Hallo' }, 'PayPa1', 'shop.example')).toContain('brand-impersonation');
    expect(codes({ bodyText: 'Hallo' }, 'Arnazon', 'shop.example')).toContain('brand-impersonation');
    expect(codes({ bodyText: 'Hallo' }, 'OpenAI', 'openai.com')).not.toContain('brand-impersonation');
    expect(codes({ bodyText: 'Hallo' }, 'ChatGPT', 'openai.com')).not.toContain('brand-impersonation');
    expect(codes({ bodyText: 'Hallo' }, 'Opener Alarm', 'shop.example')).not.toContain('brand-impersonation');
  });
});

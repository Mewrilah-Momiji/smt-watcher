import { BRANDS, SENDING_PLATFORMS, type Brand } from '../data/brands';
import { baseDomain, type Finding } from './findings';

export interface MailContent {
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  attachmentNames: string[];
}

export interface MailContext {
  fromName: string;
  fromDomain: string | null;
  fromAddress: string | null;
  /** The email carries In-Reply-To or References, as real replies do. */
  hasReplyHeaders: boolean;
  recipientAddresses: string[];
  /** The domain in From passed DKIM. */
  signedBySender?: boolean;
}

export interface MailLink {
  host: string;
  /** The linked text, if the link comes from HTML. */
  visibleText: string | null;
}

const SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'shorturl.at', 't.ly', 'rb.gy', 's.id', 'tiny.cc', 'bit.do', 'v.gd'];

/** Free hosting that lets anyone publish a page under a well-known domain. */
// The hosts after r2.dev carried 60 of 481 phishing emails in the public Nazario corpus of 2025 and none of the owner's emails, measured on 2026-11-04.
const PUBLIC_FILE_HOSTS = ['storage.googleapis.com', 'firebasestorage.googleapis.com', 'docs.google.com', 'drive.google.com', 'sites.google.com', 'forms.gle', 'web.app', 'pages.dev', 'r2.dev', 'ipfs.io', 'dweb.link', 'vercel.app', 'netlify.app', 'glitch.me', 'replit.app', 'bubbleapps.io', 'contabostorage.com', 'workers.dev', 'firebaseapp.com', 'run.app'];
const BUCKET_HOST_PATTERN = /\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/;
/** Gateways to IPFS, where a page cannot be taken down, often carry the name in their own domain. */
const IPFS_HOST_PATTERN = /(?:^|[.-])ipfs(?:[.-]|$)/;
const PRIVATE_IP = /^(?:127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|169\.254\.|0\.)|^\[(?:::1|f[cd][0-9a-f]*:|fe80:)/i;
/** Greetings in the languages the page reports in most, followed by an address instead of a name. */
const GREETING_PATTERN = '(?:dear|hello|hi|hallo|guten tag|sehr geehrte[rs]?|liebe[rs]?|bonjour|cher|ch[eè]re|ciao|gentile|hola|estimad[oa])';
/** A recipient's domain name shorter than this, such as gmx or web, is too common a word to look for in a sender's name. */
const ORG_NAME_MINIMUM = 4;
/** Mathematical alphanumerics such as 𝕁𝕒𝕦𝕔𝕙 look like letters, but filters do not read them as words. */
const STYLED_LETTERS = /[\u{1D400}-\u{1D7FF}]/gu;
const STYLED_LETTERS_MINIMUM = 5;
/** UTF-8 read as Latin-1: the ä in "Bestätigung" becomes Ã¤. */
const GARBLED_TEXT = /Ã[\u0080-¿]/;
const UNFILLED_PLACEHOLDER = /\[\s*(?:first_?name|last_?name|full_?name|name|vorname|nachname|e-?mail)\s*\]|\{\{\s*\w*name\w*\s*\}\}|%(?:first_?name|name|vorname)%/i;

/** Invisible characters. Scams put them inside words to get past filters. */
const HIDDEN = '\\u034F\\u061C\\u115F\\u1160\\u17B4\\u17B5\\u180E\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\uFEFF';
const HIDDEN_ALL = new RegExp(`[\\u00AD${HIDDEN}]`, 'g');
const HIDDEN_IN_LINE = new RegExp(`\\p{L}[\\u00AD${HIDDEN}]+\\p{L}`, 'u');
const HIDDEN_IN_BODY = new RegExp(`\\p{L}[${HIDDEN}]+\\p{L}`, 'gu');
/** Unlike a sender's name, a subject can hold soft hyphens for a good reason, such as a quoted job title. */
const HIDDEN_IN_SUBJECT = new RegExp(`\\p{L}[${HIDDEN}]+\\p{L}`, 'u');
const TEXT_DIRECTION_OVERRIDE = /[‭‮]/;
const HIDDEN_BODY_MINIMUM = 3;
/** Spam scatters these through most words, while legitimate emails contain them only here and there. */
const HIDDEN_BODY_DENSITY = 0.01;

const FOREIGN_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Thai}]/gu;
const FOREIGN_SCRIPT_SHARE = 0.3;
const CYRILLIC = /\p{Script=Cyrillic}/gu;
/**
 * A word that mixes Latin with Cyrillic or Greek letters, such as "pаrt" with a Cyrillic а. Such look-alikes hide words from
 * filters. Measured on 2026-11-04: 10 of 999 phishing emails in Phishing Pot, 3 of 481 in Nazario, none of the owner's 1872
 * legitimate emails.
 */
const MIXED_SCRIPT_WORD = /(?=\p{L}*\p{Script=Latin})(?=\p{L}*[\p{Script=Cyrillic}\p{Script=Greek}])\p{L}{3,}/gu;
/** In the body a single mixed word can be a typo, so it takes this many. */
const MIXED_SCRIPT_BODY_MINIMUM = 2;
/**
 * Cheap top-level domains common in spam. Measured on 2026-11-05: 83 of 999 Phishing Pot emails, 26 of 481 Nazario emails,
 * 81 of 974 Untroubled spam emails, none of the owner's 1872 legitimate emails. Small genuine shops use some of them, so it is a weak sign.
 */
const RISKY_TLDS = new Set(['xyz', 'top', 'sbs', 'click', 'shop', 'online', 'site', 'icu', 'vip', 'live', 'buzz', 'monster', 'rest', 'cfd', 'lat', 'bond', 'space', 'store', 'tk', 'cyou', 'beauty', 'hair', 'quest', 'mom', 'autos', 'skin', 'today']);
/**
 * A department or role instead of a person or company. Measured on 2026-11-05 from a domain other than the recipient's:
 * 91 of 481 Nazario emails, 12 of 999 Phishing Pot emails, none of the owner's 1872 legitimate emails.
 */
const ROLE_NAME_PATTERN = /\b(?:admin|administrator|support team|help ?desk|it (?:department|support|team|service)|hr (?:department|team)|human resources|system|webmail|mail ?(?:server|admin|support)|postmaster|security team|account team|e-?mail (?:admin|support|team))\b/i;
const NAME_DOMAIN = /(?:^|[\s|(<])((?:[a-z0-9-]+\.)+(?:com|de|net|org|info|eu|at|ch|shop|biz))(?=$|[\s|)>,])/i;

const FAKE_REPLY_PATTERN = /^\s*(re|aw|wg|fw|fwd)\s*:/i;
const BULK_ADDRESS_PATTERN = /^(.*\d{8,}|null)@/i;
// "ATM-Karte" added on 2026-11-06: 1 of 239 private spam emails, none of 1872 legitimate ones.
const WINDFALL_PATTERN = /(beg[üu]nstigter|erbschaft|lotterie|lottery|spende in h[öo]he|inheritance|atm[- ]?(?:karte|card))/i;
// Also "500.000 US-Dollar" and "$". Measured on 2026-11-03: one more spam email and no legitimate one.
const LARGE_AMOUNT_PATTERN = /\d{1,3}(?:[.,]\d{3}){1,3}(?:,\d{2})?\s*(?:€|euro|usd|(?:us[- ]?)?dollar|\$)|million/i;
/** Licensed lotteries in Germany print this. Measured on one recipient's emails, no spam does. */
const GAMBLING_NOTICE = /gl[üu]cksspiel kann s[üu]chtig/i;
/** Shipping notices through a shop or service name the carrier like this. */
const SENT_THROUGH_PATTERN = /\s(?:via|über)\s/i;
// "Someone has ordered you a gift, pay only the shipping": a fee for a parcel that does not exist.
// Measured on 2026-11-07: 3 of 242 private spam emails, none of 1872 legitimate ones. The English wording found
// nothing in 4752 public spam emails or 5149 emails from Apache lists.
const GIFT_PATTERN = /(hat ihnen|f[üu]r sie)[^.]{0,80}(als geschenk|geschenkt)|als geschenk (bestellt|gekauft)|(?:has|have) (?:sent|ordered|bought) you an? (?:gift|present)|(?:ordered|bought|sent) (?:\w+ )?(?:for|to) you as an? (?:gift|present)/i;
const SHIPPING_FEE_PATTERN = /versandkosten|versandgeb[üu]hr|(?:shipping|delivery|postage) (?:fees?|costs?|charges?)/i;
// Text pushed far below the message, where no reader scrolls, to feed spam filters harmless words.
// Measured on 2026-11-07: 2 of 242 private spam emails, none of 1872 legitimate ones.
const FILLER_SPACER_PATTERN = /(?:padding|margin)-top\s*:\s*\d{4,}px/i;
const LIQUIDATION_PATTERN = /insolvenz(?:verfahren|verwertung|verkauf|ware)|verwertungsverfahren/i;
// Measured on 2026-11-06 on the private test set: 1 of 239 spam emails, none of 1872 legitimate ones.
const CRYPTO_RECOVERY_PATTERN = /(r[üu]ckgewinnung|wiederherstellung|recover(?:y|ing)?)\b[^.]{0,80}(krypto|crypto|forex|investition|investment)|(krypto|crypto|forex)[^.]{0,80}(r[üu]ckgewinnung|recover)/i;
// Sextortion: a Bitcoin wallet together with at least two kinds of threat. Measured on 2026-11-08: 1 of 244 private spam emails,
// 1 in Nazario 2025, 2 in Untroubled 2026-09, none of 1872 legitimate emails or 5149 Apache list emails.
const EXTORTION_PAYMENT_PATTERN = /\b(bitcoin|btc)\b/i;
const EXTORTION_WALLET_PATTERN = /(wallet|adresse|address|brieftasche)/i;
const EXTORTION_THREAT_PATTERNS = [
  /\b(webcam|kamera|camera)\b/i,
  /\b(trojan|trojaner|spyware|malware|virus|rat)\b/i,
  /\b(24|48|72) ?(hours|stunden|h)\b/i,
  /\b(recorded|aufgenommen|aufgezeichnet|videos? (of|von) (you|dir|ihnen))\b/i,
  /\b(your|deine|ihre) (family|contacts|coworkers|colleagues|familie|kontakte|kollegen)\b/i,
  /\b(publish|veröffentlich|send (it|them) to)/i,
  /\b(police|polizei)\b/i,
  /\b(hacker|gehackt|hacked|access to (your|all) (device|devices|computer))\b/i,
];
const EXTORTION_MIN_THREATS = 2;

// Ads dressed up as an editorial report. Measured on 2026-11-06: 2 of 239 spam emails, none of 1872 legitimate ones.
// Publishers use these words too, so it counts little.
const ADVERTORIAL_PATTERN = /\b(sonderbericht|spezialreport|special report|advertorial)\b/i;
// A password sent in plain text. Measured on 2026-11-06: 1 of 239 spam emails and 1 of 1872 legitimate ones,
// so it is a hint about the risk rather than about spam.
const PLAIN_PASSWORD_PATTERN = /(ihr|dein|your)\s+(passwort|password|kennwort)\s*:\s*\S{6,}/i;

const HTML_EXTENSIONS = new Set(['html', 'htm', 'shtml']);
const RISKY_EXTENSIONS = new Set(['exe', 'scr', 'com', 'bat', 'cmd', 'pif', 'js', 'jse', 'vbs', 'vbe', 'wsf', 'hta', 'lnk', 'msi', 'iso', 'img', 'ps1', 'jar', ...HTML_EXTENSIONS, 'docm', 'xlsm']);

// "Bestätigen Sie Ihre Daten" and "Daten jetzt bestätigen" were added on 2026-11-08: 1 of 244 private spam emails, none of 1872 legitimate ones.
// Fake storage alerts that lure to a login page. Measured on 2026-11-09 in emails with a link: 6 of 254 private spam emails
// (3 of them Japanese), 4 in Nazario 2023-2025, 19 in Untroubled 2026-09/10, none of 1872 legitimate emails or 5149 Apache list emails.
const STORAGE_ALERT_PATTERN = /storage (limit|space|quota|capacity)[^.!\n]{0,40}(reached|full|exceeded|used up)|storage plan[^.!\n]{0,60}(expired|expiring|failed|renew|upgrade|suspended)|(renew|upgrade|update) your storage plan|(cloud|storage|drive|backup) (services? |account )?(has been |have been |is |are )?(disabled|suspended|paused|deactivated|blocked)|speicher(platz|limit|kapazität|plan)[^.!\n]{0,40}(voll|erreicht|überschritten|aufgebraucht|abgelaufen|läuft ab)|(cloud|speicher|backup)[- ]?(dienste?|konto)?[^.!\n]{0,20}(deaktiviert|gesperrt|pausiert|ausgesetzt)|ストレージ[^。\n]{0,30}(更新|容量|上限|失敗|停止|消失)/i;
/** A request, not a mention: legitimate emails often just name login details, for example to warn about phishing. */
const CREDENTIAL_PATTERN = /passwort (best[aä]tigen|eingeben|erneuern)|konto (verifizieren|best[aä]tigen|gesperrt|wird gesperrt)|(zugangs|anmelde)daten (best[aä]tigen|eingeben|aktualisieren|[üu]berpr[üu]fen|verifizieren)|(best[aä]tigen|aktualisieren|[üu]berpr[üu]fen|verifizieren) sie ihre (zugangs|anmelde)daten|verify your (account|identity|login details)|confirm your (account|password|login details)|account (suspended|locked|will be)|update your (information|payment|billing|details)|(zahlungs|konto|bank)(daten|informationen|angaben) (aktualisieren|best[aä]tigen|[üu]berpr[üu]fen)|[üu]berpr[üu]fen sie ihre (zahlungs|konto|bank)daten|aktualisieren sie ihre (zahlungs|konto|bank)?(daten|informationen|angaben)|your (account|mailbox|email) (has been|will be) (suspended|locked|deactivated|disabled|closed)|password (will )?expires? (today|soon|in)|email quota|mailbox (is )?full|verify your email (address|account)|cuenta (ha sido |será |sera )?(suspendida|bloqueada|desactivada)|verifi(ca|que) (tu|su) cuenta|conta (foi |será )?(suspensa|bloqueada)|verifi(que|car) (sua|a sua) conta|compte (a été |sera )?(suspendu|bloqué|désactivé)|vérifie[rz]? (votre|ton) compte|abonnement a été suspendu|(best[aä]tigen|[üu]berpr[üu]fen|aktualisieren|verifizieren) sie ihre (pers[öo]nlichen )?daten|daten jetzt (best[aä]tigen|aktualisieren|verifizieren)/i;

function hostOf(url: string): string | null {
  try {
    return new URL(url.startsWith('//') ? `https:${url}` : url).hostname.toLowerCase().replace(/\.$/, '') || null;
  } catch {
    return null;
  }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

/** The href of an a tag's attributes, quoted or not, as browsers read it: the first one wins. */
function hrefOf(attributes: string): string | null {
  for (const match of attributes.matchAll(/([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    if (match[1].toLowerCase() === 'href') return match[2] ?? match[3] ?? match[4] ?? '';
  }
  return null;
}

export function extractLinks(html: string | null, text: string | null): MailLink[] {
  const links: MailLink[] = [];
  if (html) {
    // Quoted values may hold ">", and only an attribute named exactly href counts, not data-href in front of it.
    for (const match of html.matchAll(/<a\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/a\s*>/gi)) {
      const href = hrefOf(match[1])?.trim().replace(/&amp;/gi, '&');
      if (!href || !/^(https?:)?\/\//i.test(href)) continue;
      const host = hostOf(href);
      if (host) links.push({ host, visibleText: stripTags(match[2]) });
    }
  }
  if (text) {
    // Typographic quotes end an address too: in „https://www.amazon.de“ the closing one would become part of the host.
    for (const match of text.matchAll(/\bhttps?:\/\/[^\s<>"')\]„“”‚‘’«»]+/gi)) {
      const host = hostOf(match[0]);
      if (host) links.push({ host, visibleText: null });
    }
  }
  return links;
}

function visibleDomain(text: string | null): string | null {
  if (!text) return null;
  const match = /^(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?:[/\s]|$)/i.exec(text);
  // "2.Set of memory" starts like a domain, but no domain looks like this.
  if (!match || /^\d+\.[^.]+$/.test(match[1])) return null;
  return match[1].toLowerCase();
}

function mentionsBrand(displayName: string, brand: string): boolean {
  // Word boundaries do not exist in Japanese text.
  if (/^[^\x00-\x7F]+$/.test(brand)) return displayName.includes(brand);
  return new RegExp(`(^|[^\\p{L}\\p{N}])${brand}($|[^\\p{L}\\p{N}])`, 'iu').test(displayName);
}

function isBrandDomain({ name, domains, manyDomains }: Brand, fromBase: string): boolean {
  if (domains.includes(fromBase)) return true;
  const forms = [name.replace(' ', ''), name.replace(' ', '-')];
  const label = fromBase.split('.')[0];
  return manyDomains ? forms.some((form) => fromBase.includes(form)) : forms.includes(label);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The name of the recipient's own domain in the sender's name, such as "Example IT Service" from another domain.
 * Scams pose as the recipient's IT or HR department this way. Measured on 2026-11-04: 139 of 481 phishing emails
 * in the Nazario corpus, none of the owner's 1872 legitimate emails.
 */
function recipientOrgInName(fromName: string, fromDomain: string | null, recipientAddresses: string[]): string | null {
  if (!fromDomain) return null;
  const fromBase = baseDomain(fromDomain);
  const recipientBases = [...new Set(recipientAddresses.map((address) => baseDomain(address.split('@').at(-1) ?? '')))];
  if (recipientBases.includes(fromBase)) return null;
  for (const base of recipientBases) {
    const name = base.split('.')[0];
    if (name.length < ORG_NAME_MINIMUM || !mentionsBrand(fromName, escapeRegExp(name))) continue;
    // A provider writes to its own mail customers from its main domain, such as Telekom to t-online.de.
    if (BRANDS.some((brand) => brand.domains.includes(base) && isBrandDomain(brand, fromBase))) continue;
    return name;
  }
  return null;
}

function isRecipientDomain(domain: string, recipientAddresses: string[]): boolean {
  const base = baseDomain(domain);
  return recipientAddresses.some((address) => baseDomain(address.split('@').at(-1) ?? '') === base);
}

function matchesHost(host: string, domains: string[]): boolean {
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

/** Whether most of the text is in another script, and whether that is mostly Cyrillic, which some readers use themselves. */
function foreignScript(text: string): 'cyrillic' | 'other' | null {
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  const foreign = text.match(FOREIGN_SCRIPT)?.length ?? 0;
  if (letters === 0 || foreign / letters < FOREIGN_SCRIPT_SHARE) return null;
  const cyrillic = text.match(CYRILLIC)?.length ?? 0;
  return (foreign - cyrillic) / letters < FOREIGN_SCRIPT_SHARE ? 'cyrillic' : 'other';
}

export function findContentIssues(content: MailContent, context: MailContext): Finding[] {
  const findings: Finding[] = [];
  const links = extractLinks(content.bodyHtml, content.bodyText);
  const { fromDomain } = context;
  const fromName = context.fromName.replace(HIDDEN_ALL, '');
  const subject = (content.subject ?? '').replace(HIDDEN_ALL, '');
  const bodyWithoutLinks = (content.bodyText ?? '').replace(/https?:\/\/\S+/g, ' ');

  const hiddenInBody = bodyWithoutLinks.match(HIDDEN_IN_BODY)?.length ?? 0;
  const bodyLetters = bodyWithoutLinks.match(/\p{L}/gu)?.length ?? 0;
  // Nobody else can sign with such a domain, and some big senders do pad their emails with these characters.
  const signedByBrand = Boolean(context.signedBySender && fromDomain && BRANDS.some((brand) => !brand.manyDomains && isBrandDomain(brand, baseDomain(fromDomain))));
  if (
    HIDDEN_IN_LINE.test(context.fromName) ||
    TEXT_DIRECTION_OVERRIDE.test(context.fromName) ||
    TEXT_DIRECTION_OVERRIDE.test(content.subject ?? '') ||
    HIDDEN_IN_SUBJECT.test(content.subject ?? '') && !signedByBrand ||
    (!signedByBrand && hiddenInBody >= HIDDEN_BODY_MINIMUM && hiddenInBody / bodyLetters > HIDDEN_BODY_DENSITY)
  ) {
    findings.push({
      code: 'hidden-characters',
      severity: 'warning',
    });
  }

  if ((`${fromName}\n${subject}\n${bodyWithoutLinks}`.match(STYLED_LETTERS)?.length ?? 0) >= STYLED_LETTERS_MINIMUM) {
    findings.push({
      code: 'styled-letters',
      severity: 'warning',
    });
  }

  if (UNFILLED_PLACEHOLDER.test(`${fromName}\n${subject}`)) {
    findings.push({
      code: 'unfilled-placeholder',
      severity: 'warning',
    });
  }

  if (GARBLED_TEXT.test(fromName)) {
    findings.push({
      code: 'garbled-sender-name',
      severity: 'note',
    });
  }

  if (FAKE_REPLY_PATTERN.test(subject) && !context.hasReplyHeaders) {
    findings.push({
      code: 'fake-reply',
      severity: 'note',
    });
  }

  const recipientInSubject = context.recipientAddresses.some((address) => subject.toLowerCase().includes(address.toLowerCase()));
  if (recipientInSubject) {
    findings.push({
      code: 'address-in-subject',
      severity: 'note',
    });
  }

  // Measured on 2026-11-04: 64 of 481 phishing emails in the Nazario corpus, 2 of 1872 legitimate emails of the owner.
  const addresses = context.recipientAddresses.map(escapeRegExp).join('|');
  if (addresses && new RegExp(`(?:^|[^\\p{L}])${GREETING_PATTERN}\\s*,?\\s*(?:${addresses})`, 'iu').test(content.bodyText ?? '')) {
    findings.push({
      code: 'address-greeting',
      severity: 'note',
    });
  }

  const orgName = recipientOrgInName(fromName, fromDomain, context.recipientAddresses);
  if (orgName) {
    findings.push({
      code: 'recipient-org-in-name',
      severity: 'warning',
      params: { name: orgName, domain: fromDomain ?? '' },
    });
  }

  const signedByPlatform = Boolean(context.signedBySender && fromDomain && SENDING_PLATFORMS.includes(baseDomain(fromDomain)));

  if (context.fromAddress && BULK_ADDRESS_PATTERN.test(context.fromAddress) && !signedByPlatform) {
    findings.push({
      code: 'bulk-sender-address',
      severity: 'note',
    });
  }

  const nameDomain = NAME_DOMAIN.exec(fromName)?.[1];
  if (nameDomain && fromDomain && baseDomain(nameDomain) !== baseDomain(fromDomain) && !signedByPlatform) {
    findings.push({
      code: 'display-name-domain',
      severity: 'note',
      params: { shown: nameDomain, domain: fromDomain },
    });
  }

  const fileHost = links.find((link) => matchesHost(link.host, PUBLIC_FILE_HOSTS) || BUCKET_HOST_PATTERN.test(link.host) || IPFS_HOST_PATTERN.test(link.host));
  if (fileHost) {
    findings.push({
      code: 'link-public-host',
      severity: 'note',
      params: { host: fileHost.host },
    });
  }

  const mixedInText = `${subject}
${bodyWithoutLinks}`.match(MIXED_SCRIPT_WORD)?.length ?? 0;
  if ((fromName.match(MIXED_SCRIPT_WORD)?.length ?? 0) > 0 || mixedInText >= MIXED_SCRIPT_BODY_MINIMUM) {
    findings.push({
      code: 'mixed-script-words',
      severity: 'warning',
    });
  }

  const riskyDomain = [fromDomain, ...links.map((link) => link.host)].find((domain) => domain && RISKY_TLDS.has(domain.toLowerCase().split('.').at(-1) ?? ''));
  if (riskyDomain) {
    findings.push({
      code: 'risky-tld',
      severity: 'note',
      params: { domain: riskyDomain },
    });
  }

  // A signed brand or sending platform may well write as its account or security team.
  if (fromDomain && ROLE_NAME_PATTERN.test(fromName) && !signedByBrand && !signedByPlatform && !isRecipientDomain(fromDomain, context.recipientAddresses)) {
    findings.push({
      code: 'role-name-external',
      severity: 'warning',
      params: { domain: fromDomain },
    });
  }

  const script = foreignScript(bodyWithoutLinks);
  if (script) {
    findings.push({
      code: 'foreign-script',
      severity: 'note',
      params: { script },
    });
  }

  const words = `${subject}\n${content.bodyText ?? ''}`;
  if (WINDFALL_PATTERN.test(words) && LARGE_AMOUNT_PATTERN.test(words) && !GAMBLING_NOTICE.test(words)) {
    findings.push({
      code: 'windfall-promise',
      severity: 'warning',
    });
  }
  if (GIFT_PATTERN.test(words) && SHIPPING_FEE_PATTERN.test(words)) {
    findings.push({
      code: 'gift-shipping-fee',
      severity: 'warning',
    });
  }
  if (FILLER_SPACER_PATTERN.test(content.bodyHtml ?? '')) {
    findings.push({
      code: 'hidden-filler-text',
      severity: 'warning',
    });
  }
  if (LIQUIDATION_PATTERN.test(words)) {
    findings.push({
      code: 'liquidation-offer',
      severity: 'warning',
    });
  }
  if (
    EXTORTION_PAYMENT_PATTERN.test(words) &&
    EXTORTION_WALLET_PATTERN.test(words) &&
    EXTORTION_THREAT_PATTERNS.filter((pattern) => pattern.test(words)).length >= EXTORTION_MIN_THREATS
  ) {
    findings.push({
      code: 'extortion-threat',
      severity: 'warning',
    });
  }
  if (CRYPTO_RECOVERY_PATTERN.test(words)) {
    findings.push({
      code: 'crypto-recovery',
      severity: 'warning',
    });
  }
  if (ADVERTORIAL_PATTERN.test(words)) {
    findings.push({
      code: 'advertorial',
      severity: 'note',
    });
  }
  if (PLAIN_PASSWORD_PATTERN.test(content.bodyText ?? '')) {
    findings.push({
      code: 'plain-password',
      severity: 'note',
    });
  }

  const mismatch = links.find((link) => {
    const shown = visibleDomain(link.visibleText);
    // The same name on another ending, such as dpd.de and dpd.com, is one company.
    return shown !== null && baseDomain(shown).split('.')[0] !== baseDomain(link.host).split('.')[0];
  });
  if (mismatch) {
    findings.push({
      code: context.signedBySender ? 'link-text-signed-sender' : 'link-text-mismatch',
      severity: 'note',
      params: { shown: visibleDomain(mismatch.visibleText) ?? '', host: mismatch.host },
    });
  }

  // Loopback and private addresses cannot host a page for strangers. Measured on 2026-11-05: 7 links to 127.0.0.1
  // in Apache developer emails, none of the 23 IP links in public spam and phishing.
  const ipLink = links.find((link) => /^(\d{1,3}\.){3}\d{1,3}$|^\[/.test(link.host) && !PRIVATE_IP.test(link.host));
  if (ipLink) {
    findings.push({
      code: 'link-ip-host',
      severity: 'warning',
      params: { host: ipLink.host },
    });
  }

  const punycode = links.find((link) => link.host.split('.').some((label) => label.startsWith('xn--')));
  if (punycode) {
    findings.push({
      code: 'link-punycode',
      severity: 'note',
      params: { host: punycode.host },
    });
  }

  const shortener = links.find((link) => matchesHost(link.host, SHORTENERS));
  if (shortener) {
    findings.push({
      code: 'link-shortener',
      severity: 'warning',
      params: { host: shortener.host },
    });
  }

  if (fromDomain) {
    const fromBase = baseDomain(fromDomain);
    const sentThroughBrand = (entry: Brand): boolean =>
      Boolean(context.signedBySender) && SENT_THROUGH_PATTERN.test(fromName) && links.some((link) => isBrandDomain(entry, baseDomain(link.host)));
    const brand = BRANDS.find((entry) => mentionsBrand(fromName, entry.name) && !isBrandDomain(entry, fromBase) && !sentThroughBrand(entry));
    if (brand) {
      findings.push({
        code: 'brand-impersonation',
        severity: 'warning',
        params: { brand: brand.name, domain: fromDomain },
      });
    }
  }

  if (links.length > 0 && (CREDENTIAL_PATTERN.test(words) || STORAGE_ALERT_PATTERN.test(words))) {
    findings.push({
      code: 'credential-request',
      severity: 'note',
    });
  }

  // A signed sender can stand behind its receipts and terms in HTML. Programs stay risky from anyone.
  const risky = content.attachmentNames.find((name) => {
    const extension = name.toLowerCase().split('.').at(-1) ?? '';
    return RISKY_EXTENSIONS.has(extension) && !(context.signedBySender && HTML_EXTENSIONS.has(extension));
  });
  if (risky) {
    findings.push({
      code: 'risky-attachment',
      severity: 'warning',
      params: { name: risky },
    });
  }

  return findings;
}
